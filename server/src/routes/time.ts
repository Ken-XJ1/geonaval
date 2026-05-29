import { Router, Request, Response } from 'express';
import { getColombiaTime, formatColombiaDateTime, getColombiaTimeSql } from '../utils/timeService';

const router = Router();

/**
 * GET /api/time
 * Obtiene la hora actual de Colombia desde WorldTimeAPI
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const colombiaTime = await getColombiaTime();
    
    return res.json({
      datetime: colombiaTime.toISOString(),
      formatted: formatColombiaDateTime(colombiaTime),
      sql: await getColombiaTimeSql(),
      timezone: 'America/Bogota',
      offset: '-05:00',
      timestamp: colombiaTime.getTime()
    });
  } catch (error) {
    console.error('Error obteniendo hora de Colombia:', error);
    return res.status(500).json({
      error: 'No se pudo obtener la hora de Colombia'
    });
  }
});

export default router;
