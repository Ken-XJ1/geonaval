import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';
import { auditoria, notificarAdministradores, notificarAutoridades } from '../utils/notificaciones';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT i.*, v.origen, v.destino
     FROM incidentes i
     LEFT JOIN viajes v ON v.id = i.viaje_id
     ORDER BY i.created_at DESC`
  );
  return res.json(rows);
});

router.post('/', async (req: Request, res: Response) => {
  const { viaje_id, tipo, descripcion, severidad, reportado_por } = req.body;
  if (!tipo || !descripcion) {
    return res.status(400).json({ error: 'Tipo y descripción son requeridos' });
  }
  try {
    const user = (req as Request & { user?: { nombre?: string } }).user;
    const result = await pool.query(
      `INSERT INTO incidentes (viaje_id, tipo, descripcion, severidad, reportado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [viaje_id || null, tipo, descripcion, severidad || 'media', reportado_por || user?.nombre || 'Operador']
    );

    // Obtener info del viaje si aplica
    let viajeInfo = '';
    if (viaje_id) {
      const v = await pool.query('SELECT origen, destino FROM viajes WHERE id = $1', [viaje_id]);
      if (v.rows[0]) viajeInfo = ` en viaje ${v.rows[0].origen} → ${v.rows[0].destino}`;
    }

    const severidadTexto = severidad || 'media';
    const reportadoPor = reportado_por || user?.nombre || 'Operador';

    await auditoria(
      `[INCIDENTE] Incidente reportado — Severidad: ${severidadTexto.toUpperCase()}`,
      `Tipo: ${tipo}${viajeInfo}. Reportado por: ${reportadoPor}. Descripción: ${descripcion}`
    );

    // Si es crítico o alto, notificar también a operadores y autoridades
    if (severidadTexto === 'critica' || severidadTexto === 'alta') {
      await notificarAdministradores(
        `⚠️ ALERTA: Incidente ${severidadTexto.toUpperCase()}`,
        `Se reportó un incidente de severidad ${severidadTexto}${viajeInfo}. Tipo: ${tipo}. Requiere atención inmediata.`
      );
      await notificarAutoridades(
        `⚠️ ALERTA: Incidente ${severidadTexto.toUpperCase()}`,
        `Se reportó un incidente de severidad ${severidadTexto}${viajeInfo}. Tipo: ${tipo}. Requiere atención inmediata.`
      );
    }

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST incidente:', (err as Error).message);
    return res.status(500).json({ error: 'No se pudo registrar el incidente. Intenta de nuevo.' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { estado, tipo, descripcion, severidad } = req.body;
  try {
    const anterior = await pool.query(
      'SELECT estado, tipo FROM incidentes WHERE id = $1',
      [req.params.id]
    );
    const result = await pool.query(
      `UPDATE incidentes SET
        estado = COALESCE($1, estado),
        tipo = COALESCE($2, tipo),
        descripcion = COALESCE($3, descripcion),
        severidad = COALESCE($4, severidad)
       WHERE id = $5
       RETURNING *`,
      [estado ?? null, tipo ?? null, descripcion ?? null, severidad ?? null, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });

    if (anterior.rows[0] && estado && anterior.rows[0].estado !== estado) {
      await auditoria(
        '[INCIDENTE] Estado de incidente actualizado',
        `El incidente #${req.params.id} (${anterior.rows[0].tipo}) cambió de estado: ${anterior.rows[0].estado} → ${estado}.`
      );
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT incidente:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
