import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';
import { auditoria } from '../utils/notificaciones';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT e.*,
      pr.nombre AS propietario_nombre,
      (SELECT COUNT(*)::int FROM viajes v WHERE v.embarcacion_id = e.id) AS viajes_count
     FROM embarcaciones e
     LEFT JOIN propietarios pr ON pr.id = e.propietario_id
     ORDER BY e.id`
  );
  return res.json(rows);
});

router.get('/:id/detalles', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const emb = await pool.query(
      `SELECT e.*, pr.nombre AS propietario_nombre
       FROM embarcaciones e
       LEFT JOIN propietarios pr ON pr.id = e.propietario_id
       WHERE e.id = $1`,
      [id]
    );
    if (!emb.rows[0]) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    const viajes = await safeQuery(
      `SELECT v.id, v.origen, v.destino, v.fecha_salida, v.estado,
        COALESCE(
          (SELECT string_agg(t.nombre || ' (' || t.rol || ')', ', ')
           FROM viaje_tripulacion vt
           INNER JOIN tripulacion t ON t.id = vt.tripulante_id
           WHERE vt.viaje_id = v.id),
          ''
        ) AS operadores
       FROM viajes v
       WHERE v.embarcacion_id = $1
       ORDER BY v.fecha_salida DESC`,
      [id]
    );

    const tripulacion = await safeQuery(
      `SELECT DISTINCT t.id, t.nombre, t.rol
       FROM viaje_tripulacion vt
       INNER JOIN tripulacion t ON t.id = vt.tripulante_id
       INNER JOIN viajes v ON v.id = vt.viaje_id
       WHERE v.embarcacion_id = $1
       ORDER BY t.nombre`,
      [id]
    );

    return res.json({ embarcacion: emb.rows[0], viajes, tripulacion });
  } catch (err) {
    console.error('Detalles embarcación:', (err as Error).message);
    return res.status(500).json({ error: 'Error al cargar detalles' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM embarcaciones WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { nombre, tipo, capacidad_pasajeros, motor, potencia, dimensiones, estado, propietario_id } = req.body;

  if (!nombre || !capacidad_pasajeros) {
    return res.status(400).json({ error: 'Nombre y capacidad son requeridos' });
  }

  try {
    const nicFinal = `EMB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await pool.query(
      `INSERT INTO embarcaciones
        (nic, nombre, tipo, capacidad_pasajeros, motor, potencia, dimensiones, estado, propietario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nicFinal, nombre, tipo ?? 'lancha', capacidad_pasajeros, motor ?? null, potencia ?? null, dimensiones ?? null, estado ?? 'operativa', propietario_id ?? null]
    );

    await auditoria(
      '[EMBARCACIÓN] Nueva embarcación registrada',
      `Se registró la embarcación "${nombre}" (tipo: ${tipo ?? 'lancha'}, capacidad: ${capacidad_pasajeros} pasajeros, estado: ${estado ?? 'operativa'}).`
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST embarcacion:', (err as Error).message);
    const msg = (err as Error).message || '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return res.status(400).json({ error: 'Ya existe una embarcación con ese identificador. Intenta de nuevo.' });
    }
    if (msg.includes('propietarios')) {
      return res.status(400).json({ error: 'El propietario seleccionado no existe' });
    }
    return res.status(500).json({ error: `Error al crear embarcación: ${msg}` });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { 
    nic, nombre, tipo, capacidad_pasajeros, motor, potencia, dimensiones, estado, propietario_id,
    tiempo_mantenimiento_estimado, fecha_inicio_mantenimiento, fecha_fin_mantenimiento_estimada, motivo_mantenimiento
  } = req.body;
  try {
    // Obtener estado anterior para detectar cambios relevantes
    const anterior = await pool.query(
      'SELECT nombre, estado FROM embarcaciones WHERE id = $1',
      [req.params.id]
    );

    const result = await pool.query(
      `UPDATE embarcaciones SET
        nic = COALESCE($1, nic),
        nombre = COALESCE($2, nombre),
        tipo = COALESCE($3, tipo),
        capacidad_pasajeros = COALESCE($4, capacidad_pasajeros),
        motor = $5,
        potencia = $6,
        dimensiones = $7,
        estado = COALESCE($8, estado),
        propietario_id = $9,
        tiempo_mantenimiento_estimado = $10,
        fecha_inicio_mantenimiento = $11,
        fecha_fin_mantenimiento_estimada = $12,
        motivo_mantenimiento = $13
       WHERE id = $14
       RETURNING *`,
      [
        nic ?? null, 
        nombre ?? null, 
        tipo ?? null, 
        capacidad_pasajeros ?? null, 
        motor ?? null, 
        potencia ?? null, 
        dimensiones ?? null, 
        estado ?? null, 
        propietario_id ?? null,
        tiempo_mantenimiento_estimado ?? null,
        fecha_inicio_mantenimiento ?? null,
        fecha_fin_mantenimiento_estimada ?? null,
        motivo_mantenimiento ?? null,
        req.params.id
      ]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });

    const nombreFinal = nombre || anterior.rows[0]?.nombre || `ID ${req.params.id}`;
    const estadoAnterior = anterior.rows[0]?.estado;
    const estadoNuevo = estado || estadoAnterior;

    let detalle = `Se actualizó la embarcación "${nombreFinal}".`;
    if (estadoAnterior && estado && estadoAnterior !== estado) {
      detalle = `La embarcación "${nombreFinal}" cambió de estado: ${estadoAnterior} → ${estado}.`;
      if (tiempo_mantenimiento_estimado) {
        detalle += ` Tiempo estimado: ${tiempo_mantenimiento_estimado}.`;
      }
    }

    await auditoria('[EMBARCACIÓN] Embarcación modificada', detalle);

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT embarcacion:', (err as Error).message);
    return res.status(500).json({ error: `Error al actualizar: ${(err as Error).message}` });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const info = await pool.query(
      'SELECT nombre, tipo, estado FROM embarcaciones WHERE id = $1',
      [req.params.id]
    );
    const result = await pool.query(
      'DELETE FROM embarcaciones WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    if (info.rows[0]) {
      await auditoria(
        '[EMBARCACIÓN] Embarcación eliminada',
        `Se eliminó la embarcación "${info.rows[0].nombre}" (tipo: ${info.rows[0].tipo}, estado: ${info.rows[0].estado}).`
      );
    }
    return res.json({ message: 'Eliminado' });
  } catch (err) {
    console.error('DELETE embarcacion:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
