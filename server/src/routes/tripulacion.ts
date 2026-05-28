import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';
import { auditoria } from '../utils/notificaciones';

const router = Router();
router.use(verifyToken);

router.get('/', async (_req: Request, res: Response) => {
  const rows = await safeQuery(
    `SELECT t.*,
      (SELECT e.nombre
       FROM viaje_tripulacion vt
       INNER JOIN viajes v ON v.id = vt.viaje_id
       INNER JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE vt.tripulante_id = t.id
       ORDER BY v.fecha_salida DESC
       LIMIT 1
      ) AS embarcacion_nombre,
      (SELECT COUNT(*)::int
       FROM viaje_tripulacion vt
       WHERE vt.tripulante_id = t.id
      ) AS viajes_count
     FROM tripulacion t
     ORDER BY t.id`
  );
  return res.json(rows);
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
  const { nombre, documento, rol, telefono, email, licencias, activo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tripulacion
        (nombre, documento, rol, telefono, email, licencias, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre, documento, rol, telefono, email, licencias, activo ?? true]
    );
    await auditoria(
      '[TRIPULACIÓN] Nuevo tripulante registrado',
      `Se registró a "${nombre}" como ${rol} con documento ${documento}.`
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST tripulacion:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { nombre, documento, rol, telefono, email, licencias, activo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tripulacion SET
        nombre = $1, documento = $2, rol = $3, telefono = $4,
        email = $5, licencias = $6, activo = $7
       WHERE id = $8
       RETURNING *`,
      [nombre, documento, rol, telefono, email, licencias, activo, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    const estadoTexto = activo === false ? 'desactivado' : 'actualizado';
    await auditoria(
      '[TRIPULACIÓN] Tripulante modificado',
      `El tripulante "${nombre}" (ID ${req.params.id}, rol: ${rol}) fue ${estadoTexto}.`
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT tripulacion:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const info = await pool.query(
      'SELECT nombre, rol, documento FROM tripulacion WHERE id = $1',
      [req.params.id]
    );
    const result = await pool.query(
      'DELETE FROM tripulacion WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'No encontrado' });
    if (info.rows[0]) {
      await auditoria(
        '[TRIPULACIÓN] Tripulante eliminado',
        `Se eliminó al tripulante "${info.rows[0].nombre}" (${info.rows[0].rol}, doc: ${info.rows[0].documento}).`
      );
    }
    return res.json({ message: 'Eliminado' });
  } catch (err) {
    console.error('DELETE tripulacion:', (err as Error).message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
