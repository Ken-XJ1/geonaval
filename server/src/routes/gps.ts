import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// Recorrido completo de un viaje
router.get('/viaje/:viajeId', async (req: Request, res: Response) => {
  const rows = await safeQuery(
    'SELECT * FROM ubicaciones_gps WHERE viaje_id = $1 ORDER BY timestamp ASC',
    [req.params.viajeId]
  );
  return res.json(rows);
});

// Última posición de todos los viajes en curso
router.get('/en-curso', async (_req: Request, res: Response) => {
  try {
    const rows = await pool.query(`
      SELECT DISTINCT ON (v.id)
        v.id AS viaje_id,
        v.origen,
        v.destino,
        v.estado,
        e.nombre AS embarcacion_nombre,
        u.latitud,
        u.longitud,
        u.timestamp
      FROM viajes v
      LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
      LEFT JOIN ubicaciones_gps u ON u.viaje_id = v.id
      WHERE v.estado = 'en_curso'
      ORDER BY v.id, u.timestamp DESC
    `);
    return res.json(rows.rows);
  } catch (err) {
    console.error('GPS en-curso:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

// Guardar nueva posición GPS
router.post('/', async (req: Request, res: Response) => {
  const { viaje_id, latitud, longitud } = req.body;
  if (!viaje_id || latitud === undefined || longitud === undefined) {
    return res.status(400).json({ error: 'viaje_id, latitud y longitud son requeridos' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO ubicaciones_gps (viaje_id, latitud, longitud)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [viaje_id, latitud, longitud]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('GPS post:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
