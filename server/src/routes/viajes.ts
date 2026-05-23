import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const VIAJES_LIST_SQL = `
  SELECT v.*,
    COUNT(vp.pasajero_id)::int AS pasajeros_count,
    e.nombre AS embarcacion_nombre
  FROM viajes v
  LEFT JOIN viaje_pasajeros vp ON vp.viaje_id = v.id
  LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
  GROUP BY v.id, e.nombre
  ORDER BY v.fecha_salida DESC
`;

router.get('/', async (_req: Request, res: Response) => {
  const rows = await safeQuery(VIAJES_LIST_SQL);
  return res.json(rows);
});

router.get('/disponibles', async (_req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT v.*, e.nombre AS embarcacion_nombre, e.capacidad_pasajeros,
      (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS pasajeros_count
     FROM viajes v
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     WHERE v.estado = 'programado'
       AND (v.fecha_limite_inscripcion IS NULL OR v.fecha_limite_inscripcion > NOW())
     ORDER BY v.fecha_salida ASC`
  );
  return res.json(
    rows.map((r) => ({
      ...r,
      cupos_disponibles:
        Number(r.capacidad_pasajeros ?? 0) - Number(r.pasajeros_count ?? 0),
    }))
  );
});

router.get('/mi-viaje', async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number } }).user;
  if (!user || !user.id) return res.json(null);

  const rows = await safeQuery(
    `SELECT v.*, vp.asiento, vp.precio_pagado, e.nombre AS embarcacion_nombre,
            e.capacidad_pasajeros,
            (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS pasajeros_count
     FROM viaje_pasajeros vp
     INNER JOIN viajes v ON v.id = vp.viaje_id
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     WHERE vp.usuario_id = $1
       AND v.estado IN ('programado', 'en_curso')
     ORDER BY v.fecha_salida ASC
     LIMIT 1`,
    [user.id]
  );

  if (!rows[0]) return res.json(null);
  return res.json(rows[0]);
});

router.post('/:id/inscribir', async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number; nombre: string; email: string } }).user;
  const viajeId = req.params.id;

  try {
    const viajeRes = await pool.query(
      `SELECT v.*, e.capacidad_pasajeros,
        (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS ocupados
       FROM viajes v
       LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE v.id = $1`,
      [viajeId]
    );
    const viaje = viajeRes.rows[0];
    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (viaje.estado !== 'programado') {
      return res.status(400).json({ error: 'Este viaje ya no acepta inscripciones' });
    }
    if (
      viaje.fecha_limite_inscripcion &&
      new Date(viaje.fecha_limite_inscripcion) < new Date()
    ) {
      return res.status(400).json({ error: 'El periodo de inscripción ya cerró' });
    }
    if (viaje.ocupados >= viaje.capacidad_pasajeros) {
      return res.status(400).json({ error: 'No hay cupos disponibles' });
    }

    const existe = await pool.query(
      `SELECT 1 FROM viaje_pasajeros WHERE viaje_id = $1 AND usuario_id = $2`,
      [viajeId, user.id]
    );
    if (existe.rows[0]) {
      return res.status(400).json({ error: 'Ya estás inscrito en este viaje' });
    }

    // Asegurar que existe registro en la tabla pasajeros
    let pasajeroId: number;
    const pasExistente = await pool.query(
      'SELECT id FROM pasajeros WHERE usuario_id = $1',
      [user.id]
    );
    if (pasExistente.rows[0]) {
      pasajeroId = pasExistente.rows[0].id;
    } else {
      const nuevoPas = await pool.query(
        `INSERT INTO pasajeros (usuario_id, nombre, documento, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          user.id,
          user.nombre || 'Usuario',
          `USR-${user.id}`,
          user.email || `user${user.id}@geonaval.local`,
        ]
      );
      pasajeroId = nuevoPas.rows[0].id;
    }

    const asiento = `A-${String(viaje.ocupados + 1).padStart(2, '0')}`;

    await pool.query(
      `INSERT INTO viaje_pasajeros (viaje_id, pasajero_id, usuario_id, asiento, precio_pagado)
       VALUES ($1, $2, $3, $4, $5)`,
      [viajeId, pasajeroId, user.id, asiento, viaje.precio || 0]
    );

    return res.status(201).json({ message: 'Inscripción exitosa', asiento });
  } catch (err) {
    console.error('Inscribir:', (err as Error).message);
    return res.status(500).json({ error: 'No se pudo completar la inscripción' });
  }
});

router.delete('/:id/cancelar-inscripcion', async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number } }).user;
  const viajeId = req.params.id;

  try {
    const viajeRes = await pool.query('SELECT estado FROM viajes WHERE id = $1', [viajeId]);
    if (!viajeRes.rows[0]) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (viajeRes.rows[0].estado !== 'programado') {
      return res.status(400).json({ error: 'No se puede cancelar la inscripción si el viaje no está programado' });
    }

    const result = await pool.query(
      'DELETE FROM viaje_pasajeros WHERE viaje_id = $1 AND usuario_id = $2 RETURNING *',
      [viajeId, user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No estás inscrito en este viaje' });
    }

    return res.json({ message: 'Inscripción cancelada' });
  } catch (err) {
    console.error('Cancelar inscripción:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/:id/pasajeros', async (req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT p.* FROM pasajeros p
     INNER JOIN viaje_pasajeros vp ON vp.pasajero_id = p.id
     WHERE vp.viaje_id = $1
     ORDER BY p.nombre`,
    [req.params.id]
  );
  return res.json(rows);
});

router.post('/:id/pasajeros', async (req: Request, res: Response) => {
  const { pasajero_id, asiento, precio_pagado, usuario_id } = req.body;
  if (!pasajero_id) {
    return res.status(400).json({ error: 'pasajero_id requerido' });
  }
  try {
    const viaje = await pool.query('SELECT precio FROM viajes WHERE id = $1', [
      req.params.id,
    ]);
    await pool.query(
      `INSERT INTO viaje_pasajeros (viaje_id, pasajero_id, asiento, precio_pagado, usuario_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (viaje_id, pasajero_id) DO UPDATE SET
         asiento = EXCLUDED.asiento,
         precio_pagado = EXCLUDED.precio_pagado`,
      [
        req.params.id,
        pasajero_id,
        asiento || null,
        precio_pagado ?? viaje.rows[0]?.precio ?? 0,
        usuario_id || null,
      ]
    );
    return res.status(201).json({ message: 'Pasajero asignado al viaje' });
  } catch (err) {
    console.error('Asignar pasajero:', (err as Error).message);
    return res.status(500).json({ error: 'No se pudo asignar el pasajero' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT v.*,
      COUNT(vp.pasajero_id)::int AS pasajeros_count,
      e.nombre AS embarcacion_nombre
     FROM viajes v
     LEFT JOIN viaje_pasajeros vp ON vp.viaje_id = v.id
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     WHERE v.id = $1
     GROUP BY v.id, e.nombre`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
  return res.json(rows[0]);
});

router.post('/', async (req: Request, res: Response) => {
  const {
    fecha_salida,
    cierre_inscripcion,
    origen,
    destino,
    embarcacion_id,
    precio,
    estado,
    justificacion_cancelacion,
  } = req.body;
  if (!fecha_salida || !origen || !destino || !embarcacion_id) {
    return res.status(400).json({
      error: 'Fecha, origen, destino y embarcación son requeridos',
    });
  }
  const user = (req as Request & { user?: { id: number } }).user;
  const cierre =
    cierre_inscripcion ||
    new Date(new Date(fecha_salida).getTime() - 2 * 60 * 60 * 1000).toISOString();
  try {
    const result = await pool.query(
      `INSERT INTO viajes
        (fecha_salida, cierre_inscripcion, origen, destino, embarcacion_id, precio, estado, justificacion_cancelacion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        fecha_salida,
        cierre,
        origen,
        destino,
        embarcacion_id,
        precio ?? 0,
        estado ?? 'programado',
        justificacion_cancelacion,
        user?.id && user.id > 0 ? user.id : null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST viaje:', (err as Error).message);
    return res.status(500).json({
      error: 'No se pudo crear el viaje. Verifica que la embarcación exista.',
    });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const {
    fecha_salida,
    cierre_inscripcion,
    origen,
    destino,
    embarcacion_id,
    precio,
    estado,
    justificacion_cancelacion,
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE viajes SET
        fecha_salida = COALESCE($1, fecha_salida),
        cierre_inscripcion = COALESCE($2, cierre_inscripcion),
        origen = COALESCE($3, origen),
        destino = COALESCE($4, destino),
        embarcacion_id = COALESCE($5, embarcacion_id),
        precio = COALESCE($6, precio),
        estado = COALESCE($7, estado),
        justificacion_cancelacion = COALESCE($8, justificacion_cancelacion)
       WHERE id = $9
       RETURNING *`,
      [
        fecha_salida,
        cierre_inscripcion,
        origen,
        destino,
        embarcacion_id,
        precio,
        estado,
        justificacion_cancelacion,
        req.params.id,
      ]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT viaje:', (err as Error).message);
    return res.status(500).json({ error: 'No se pudo actualizar el viaje' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM viajes WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    return res.json({ message: 'Eliminado' });
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
