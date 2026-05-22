import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

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
      [
        viaje_id || null,
        tipo,
        descripcion,
        severidad || 'media',
        reportado_por || user?.nombre || 'Operador',
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST incidente:', (err as Error).message);
    return res.status(500).json({
      error: 'No se pudo registrar el incidente. Intenta de nuevo.',
    });
  }
});

export default router;
