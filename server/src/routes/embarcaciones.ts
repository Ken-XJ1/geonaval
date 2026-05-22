import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  const rows = await safeQuery('SELECT * FROM embarcaciones ORDER BY id');
  return res.json(rows);
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
  const {
    nic,
    nombre,
    tipo,
    capacidad_pasajeros,
    motor,
    potencia,
    dimensiones,
    estado,
    propietario_id,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO embarcaciones
        (nic, nombre, tipo, capacidad_pasajeros, motor, potencia, dimensiones, estado, propietario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        nic,
        nombre,
        tipo,
        capacidad_pasajeros,
        motor,
        potencia,
        dimensiones,
        estado ?? 'operativa',
        propietario_id,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const {
    nic,
    nombre,
    tipo,
    capacidad_pasajeros,
    motor,
    potencia,
    dimensiones,
    estado,
    propietario_id,
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE embarcaciones SET
        nic = $1, nombre = $2, tipo = $3, capacidad_pasajeros = $4,
        motor = $5, potencia = $6, dimensiones = $7, estado = $8, propietario_id = $9
       WHERE id = $10
       RETURNING *`,
      [
        nic,
        nombre,
        tipo,
        capacidad_pasajeros,
        motor,
        potencia,
        dimensiones,
        estado,
        propietario_id,
        req.params.id,
      ]
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
      'DELETE FROM embarcaciones WHERE id = $1 RETURNING id',
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
