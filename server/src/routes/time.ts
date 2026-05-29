import { Router, Request, Response } from 'express';
import { getColombiaTimeSql } from '../utils/timeService';

const router = Router();

/**
 * GET /api/time
 * Devuelve la hora actual de Colombia (America/Bogota) desde WorldTimeAPI
 * El campo "sql" es el que se usa en toda la aplicación.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = await getColombiaTimeSql();
    // sql = "2026-05-29 23:57:00"
    const [datePart, timePart] = sql.split(' ');
    const [year, month, day] = datePart.split('-');
    const [h, m, s] = timePart.split(':');

    return res.json({
      sql,                                          // "2026-05-29 23:57:00"
      formatted: `${day}/${month}/${year} ${h}:${m}:${s}`, // "29/05/2026 23:57:00"
      date: datePart,                               // "2026-05-29"
      time: `${h}:${m}`,                            // "23:57"
      timezone: 'America/Bogota',
      offset: '-05:00',
    });
  } catch (error) {
    console.error('Error obteniendo hora de Colombia:', error);
    return res.status(500).json({ error: 'No se pudo obtener la hora de Colombia' });
  }
});

export default router;
