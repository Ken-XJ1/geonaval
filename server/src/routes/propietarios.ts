import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';
import { auditoria } from '../utils/notificaciones';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT p.*,
      COUNT(e.id)::int AS embarcaciones_count
     FROM propietarios p
     LEFT JOIN embarcaciones e ON e.propietario_id = p.id
     GROUP BY p.id
     ORDER BY p.id`
  );
  return res.json(rows);
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM propietarios WHERE id = $1',
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
    tipo, nombre, identificacion, telefono, direccion,
    nit, razon_social, matricula_mercantil, fecha_registro, estado,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO propietarios
        (tipo, nombre, identificacion, telefono, direccion, nit, razon_social, matricula_mercantil, fecha_registro, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [tipo, nombre, identificacion, telefono, direccion, nit, razon_social, matricula_mercantil, fecha_registro, estado ?? 'activo']
    );
    await auditoria(
      '[PROPIETARIO] Nuevo propietario registrado',
      `Se registró al propietario "${nombre}" (${tipo}, ID: ${identificacion}).`
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST propietario:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const {
    tipo, nombre, identificacion, telefono, direccion,
    nit, razon_social, matricula_mercantil, fecha_registro, estado,
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE propietarios SET
        tipo = $1, nombre = $2, identificacion = $3, telefono = $4, direccion = $5,
        nit = $6, razon_social = $7, matricula_mercantil = $8, fecha_registro = $9, estado = $10
       WHERE id = $11
       RETURNING *`,
      [tipo, nombre, identificacion, telefono, direccion, nit, razon_social, matricula_mercantil, fecha_registro, estado, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    await auditoria(
      '[PROPIETARIO] Propietario modificado',
      `Se actualizaron los datos del propietario "${nombre}" (ID ${req.params.id}). Estado: ${estado}.`
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT propietario:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const info = await pool.query(
      'SELECT nombre, identificacion, tipo FROM propietarios WHERE id = $1',
      [req.params.id]
    );
    const result = await pool.query(
      'DELETE FROM propietarios WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    if (info.rows[0]) {
      await auditoria(
        '[PROPIETARIO] Propietario eliminado',
        `Se eliminó al propietario "${info.rows[0].nombre}" (${info.rows[0].tipo}, ID: ${info.rows[0].identificacion}).`
      );
    }
    return res.json({ message: 'Eliminado' });
  } catch (err) {
    console.error('DELETE propietario:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
