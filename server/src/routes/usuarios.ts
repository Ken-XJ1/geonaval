import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY id'
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, created_at FROM usuarios WHERE id = $1',
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
  const { nombre, email, password, rol } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, activo, created_at`,
      [nombre, email, password_hash, rol]
    );
    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { nombre, email, rol, activo, password } = req.body;
  try {
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE usuarios SET nombre = $1, email = $2, rol = $3, activo = $4, password_hash = $5
         WHERE id = $6
         RETURNING id, nombre, email, rol, activo, created_at`,
        [nombre, email, rol, activo ?? true, password_hash, req.params.id]
      );
      if (!result.rows[0])
        return res.status(404).json({ error: 'No encontrado' });
      return res.json(result.rows[0]);
    }
    const result = await pool.query(
      `UPDATE usuarios SET nombre = $1, email = $2, rol = $3, activo = $4
       WHERE id = $5
       RETURNING id, nombre, email, rol, activo, created_at`,
      [nombre, email, rol, activo ?? true, req.params.id]
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
      'DELETE FROM usuarios WHERE id = $1 RETURNING id',
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
