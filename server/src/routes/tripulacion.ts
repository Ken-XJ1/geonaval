import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tripulacion ORDER BY id'
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tripulacion WHERE id = $1',
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
  const { nombre, documento, rol, telefono, email, licencias, activo } =
    req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tripulacion
        (nombre, documento, rol, telefono, email, licencias, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        nombre,
        documento,
        rol,
        telefono,
        email,
        licencias,
        activo ?? true,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { nombre, documento, rol, telefono, email, licencias, activo } =
    req.body;
  try {
    const result = await pool.query(
      `UPDATE tripulacion SET
        nombre = $1, documento = $2, rol = $3, telefono = $4,
        email = $5, licencias = $6, activo = $7
       WHERE id = $8
       RETURNING *`,
      [
        nombre,
        documento,
        rol,
        telefono,
        email,
        licencias,
        activo,
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
      'DELETE FROM tripulacion WHERE id = $1 RETURNING id',
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
