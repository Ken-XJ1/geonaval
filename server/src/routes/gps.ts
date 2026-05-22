import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/viaje/:viajeId', async (req: Request, res: Response) => {
  const rows = await safeQuery(
    'SELECT * FROM ubicaciones_gps WHERE viaje_id = $1 ORDER BY timestamp DESC',
    [req.params.viajeId]
  );
  return res.json(rows);
});

router.post('/', async (req: Request, res: Response) => {
  const { viaje_id, latitud, longitud } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ubicaciones_gps (viaje_id, latitud, longitud)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [viaje_id, latitud, longitud]
    );
    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
