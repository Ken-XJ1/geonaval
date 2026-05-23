import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number } }).user;
  const rows = await safeQuery(
    'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 50',
    [user.id]
  );
  return res.json(rows);
});

router.put('/:id/leida', async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number } }).user;
  try {
    const result = await pool.query(
      'UPDATE notificaciones SET leida = true WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [req.params.id, user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/marcar-todas-leidas', async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number } }).user;
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE usuario_id = $1 AND leida = false',
      [user.id]
    );
    return res.json({ message: 'Todas marcadas como leídas' });
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
