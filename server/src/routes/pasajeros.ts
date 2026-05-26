import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT DISTINCT ON (p.id) p.*,
      vp.viaje_id,
      vp.asiento,
      vp.precio_pagado,
      vp.metodo_pago,
      v.origen,
      v.destino,
      v.estado AS viaje_estado,
      v.fecha_salida AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota' AS fecha_salida,
      e.nombre AS embarcacion_nombre
     FROM pasajeros p
     LEFT JOIN viaje_pasajeros vp ON vp.pasajero_id = p.id
     LEFT JOIN viajes v ON v.id = vp.viaje_id AND v.estado IN ('programado', 'en_curso')
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     ORDER BY p.id DESC, v.fecha_salida DESC NULLS LAST`
  );
  return res.json(rows);
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pasajeros WHERE id = $1',
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
  const { nombre, documento, telefono, email } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pasajeros (nombre, documento, telefono, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, documento, telefono, email]
    );
    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { nombre, documento, telefono, email } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pasajeros SET
        nombre = $1, documento = $2, telefono = $3, email = $4
       WHERE id = $5
       RETURNING *`,
      [nombre, documento, telefono, email, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM pasajeros WHERE id = $1 RETURNING id',
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
