import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { safeQuery } from '../db/safeQuery';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

type AuthUser = { id: number; rol: string; nombre: string; email?: string };

async function resolveUsuarioId(user: AuthUser): Promise<number | null> {
  if (user.email) {
    const byEmail = await pool.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = $1 AND activo = true',
      [user.email.toLowerCase()]
    );
    if (byEmail.rows[0]) return byEmail.rows[0].id as number;
  }
  if (user.id > 0) {
    const byId = await pool.query(
      'SELECT id FROM usuarios WHERE id = $1 AND activo = true',
      [user.id]
    );
    if (byId.rows[0]) return byId.rows[0].id as number;
  }
  return null;
}

router.get('/mi-reserva', async (req: Request, res: Response) => {
  const user = (req as Request & { user: AuthUser }).user;
  const usuarioId = await resolveUsuarioId(user);
  if (!usuarioId) {
    return res.json(null);
  }

  const rows = await safeQuery(
    `SELECT v.*, vp.asiento, vp.precio_pagado, e.nombre AS embarcacion_nombre,
            e.capacidad_pasajeros,
            (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS pasajeros_count
     FROM viaje_pasajeros vp
     INNER JOIN viajes v ON v.id = vp.viaje_id
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     WHERE vp.usuario_id = $1
       AND v.estado IN ('programado', 'en_curso')
     ORDER BY v.fecha_salida ASC
     LIMIT 1`,
    [usuarioId]
  );

  if (!rows[0]) return res.json(null);
  return res.json(rows[0]);
});

router.post('/reservar', async (req: Request, res: Response) => {
  const user = (req as Request & { user: AuthUser }).user;
  const { viaje_id, asiento } = req.body;

  if (!viaje_id) {
    return res.status(400).json({ error: 'viaje_id requerido' });
  }

  const usuarioId = await resolveUsuarioId(user);
  if (!usuarioId) {
    return res.status(400).json({
      error: 'No se encontró tu usuario. Inicia sesión con una cuenta registrada.',
    });
  }

  try {
    const viajeRes = await pool.query(
      `SELECT v.*, e.capacidad_pasajeros,
        (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS ocupados
       FROM viajes v
       LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE v.id = $1`,
      [viaje_id]
    );
    const viaje = viajeRes.rows[0];
    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (viaje.estado !== 'programado') {
      return res.status(400).json({ error: 'Este viaje ya no acepta inscripciones' });
    }
    if (
      viaje.cierre_inscripcion &&
      new Date(viaje.cierre_inscripcion) < new Date()
    ) {
      return res.status(400).json({ error: 'El periodo de inscripción ya cerró' });
    }
    if (viaje.ocupados >= viaje.capacidad_pasajeros) {
      return res.status(400).json({ error: 'No hay cupos disponibles' });
    }

    const existe = await pool.query(
      `SELECT 1 FROM viaje_pasajeros WHERE viaje_id = $1 AND usuario_id = $2`,
      [viaje_id, usuarioId]
    );
    if (existe.rows[0]) {
      return res.status(400).json({ error: 'Ya estás inscrito en este viaje' });
    }

    const usuario = await pool.query(
      'SELECT nombre, email FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    const u = usuario.rows[0];

    let pasajeroId: number;
    const pasExistente = await pool.query(
      'SELECT id FROM pasajeros WHERE usuario_id = $1',
      [usuarioId]
    );
    if (pasExistente.rows[0]) {
      pasajeroId = pasExistente.rows[0].id;
    } else {
      const nuevoPas = await pool.query(
        `INSERT INTO pasajeros (usuario_id, nombre, documento, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          usuarioId,
          u.nombre,
          `USR-${usuarioId}`,
          u.email || `user${usuarioId}@geonaval.local`,
        ]
      );
      pasajeroId = nuevoPas.rows[0].id;
    }

    const asientoFinal =
      asiento ||
      `A-${String(viaje.ocupados + 1).padStart(2, '0')}`;

    await pool.query(
      `INSERT INTO viaje_pasajeros (viaje_id, pasajero_id, usuario_id, asiento, precio_pagado)
       VALUES ($1, $2, $3, $4, $5)`,
      [viaje_id, pasajeroId, usuarioId, asientoFinal, viaje.precio || 0]
    );

    const reserva = await pool.query(
      `SELECT v.*, vp.asiento, vp.precio_pagado, e.nombre AS embarcacion_nombre
       FROM viaje_pasajeros vp
       INNER JOIN viajes v ON v.id = vp.viaje_id
       LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE vp.viaje_id = $1 AND vp.usuario_id = $2`,
      [viaje_id, usuarioId]
    );

    return res.status(201).json(reserva.rows[0]);
  } catch (err) {
    console.error('Reservar:', (err as Error).message);
    return res.status(500).json({ error: 'No se pudo completar la inscripción' });
  }
});

export default router;
