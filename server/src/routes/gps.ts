import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/viaje/:viajeId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ubicaciones_gps WHERE viaje_id = $1 ORDER BY timestamp DESC',
      [req.params.viajeId]
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
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
