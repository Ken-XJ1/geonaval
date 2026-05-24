"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const safeQuery_1 = require("../db/safeQuery");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
const VIAJES_LIST_SQL = `
  SELECT v.*,
    COUNT(vp.pasajero_id)::int AS pasajeros_count,
    e.nombre AS embarcacion_nombre
  FROM viajes v
  LEFT JOIN viaje_pasajeros vp ON vp.viaje_id = v.id
  LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
  GROUP BY v.id, e.nombre
  ORDER BY v.fecha_salida DESC
`;
router.get('/', async (_req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(VIAJES_LIST_SQL);
    return res.json(rows);
});
router.get('/disponibles', async (_req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT v.*, e.nombre AS embarcacion_nombre, e.capacidad_pasajeros,
      (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS pasajeros_count
     FROM viajes v
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     WHERE v.estado = 'programado'
       AND (v.fecha_limite_inscripcion IS NULL OR v.fecha_limite_inscripcion > NOW())
     ORDER BY v.fecha_salida ASC`);
    return res.json(rows.map((r) => ({
        ...r,
        cupos_disponibles: Number(r.capacidad_pasajeros ?? 0) - Number(r.pasajeros_count ?? 0),
    })));
});
router.get('/mi-viaje', async (req, res) => {
    const user = req.user;
    if (!user || user.id === undefined || user.id === null)
        return res.json(null);
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT v.*, vp.asiento, vp.precio_pagado, vp.metodo_pago, e.nombre AS embarcacion_nombre,
            e.capacidad_pasajeros,
            (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS pasajeros_count
     FROM viaje_pasajeros vp
     INNER JOIN viajes v ON v.id = vp.viaje_id
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     WHERE vp.usuario_id = $1
       AND v.estado IN ('programado', 'en_curso')
     ORDER BY v.fecha_salida ASC
     LIMIT 1`, [user.id]);
    if (!rows[0])
        return res.json(null);
    return res.json(rows[0]);
});
// Estadísticas de compras/tickets — debe ir ANTES de /:id para no ser capturada como param
router.get('/compras/stats', async (_req, res) => {
    try {
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);
        const hoyFin = new Date();
        hoyFin.setHours(23, 59, 59, 999);
        const [ventasHoy, totalRecaudado, confirmados, pendientes] = await Promise.all([
            pool_1.default.query(`SELECT COUNT(*)::int AS count FROM viaje_pasajeros vp
         INNER JOIN pasajeros p ON p.id = vp.pasajero_id
         WHERE p.created_at >= $1 AND p.created_at <= $2`, [hoyInicio.toISOString(), hoyFin.toISOString()]),
            pool_1.default.query(`SELECT COALESCE(SUM(precio_pagado), 0)::numeric AS total FROM viaje_pasajeros`),
            pool_1.default.query(`SELECT COUNT(*)::int AS count FROM viaje_pasajeros vp
         INNER JOIN viajes v ON v.id = vp.viaje_id
         WHERE v.estado IN ('programado', 'en_curso', 'finalizado')`),
            pool_1.default.query(`SELECT COUNT(*)::int AS count FROM viaje_pasajeros vp
         INNER JOIN viajes v ON v.id = vp.viaje_id
         WHERE v.estado = 'cancelado'`),
        ]);
        return res.json({
            ventasHoy: ventasHoy.rows[0].count,
            totalRecaudado: Number(totalRecaudado.rows[0].total),
            ticketsConfirmados: confirmados.rows[0].count,
            ticketsPendientes: pendientes.rows[0].count,
        });
    }
    catch (err) {
        console.error('Compras stats:', err.message);
        return res.status(500).json({ error: 'Error al calcular estadísticas' });
    }
});
router.post('/:id/inscribir', async (req, res) => {
    const user = req.user;
    const viajeId = req.params.id;
    const { metodo_pago } = req.body;
    if (!user || user.id === undefined || user.id === null) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    try {
        const viajeRes = await pool_1.default.query(`SELECT v.*, e.capacidad_pasajeros,
        (SELECT COUNT(*)::int FROM viaje_pasajeros WHERE viaje_id = v.id) AS ocupados
       FROM viajes v
       LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE v.id = $1`, [viajeId]);
        const viaje = viajeRes.rows[0];
        if (!viaje)
            return res.status(404).json({ error: 'Viaje no encontrado' });
        if (viaje.estado !== 'programado') {
            return res.status(400).json({ error: 'Este viaje ya no acepta inscripciones' });
        }
        const limite = viaje.fecha_limite_inscripcion || viaje.cierre_inscripcion;
        if (limite && new Date(limite) < new Date()) {
            return res.status(400).json({ error: 'El periodo de inscripción ya cerró' });
        }
        if (viaje.ocupados >= viaje.capacidad_pasajeros) {
            return res.status(400).json({ error: 'No hay cupos disponibles' });
        }
        const existe = await pool_1.default.query(`SELECT 1 FROM viaje_pasajeros WHERE viaje_id = $1 AND usuario_id = $2`, [viajeId, user.id]);
        if (existe.rows[0]) {
            return res.status(400).json({ error: 'Ya estás inscrito en este viaje' });
        }
        // Asegurar que existe registro en la tabla pasajeros
        let pasajeroId;
        const pasExistente = await pool_1.default.query('SELECT id FROM pasajeros WHERE usuario_id = $1', [user.id]);
        if (pasExistente.rows[0]) {
            pasajeroId = pasExistente.rows[0].id;
        }
        else {
            const nuevoPas = await pool_1.default.query(`INSERT INTO pasajeros (usuario_id, nombre, documento, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id`, [
                user.id,
                user.nombre || 'Usuario',
                `USR-${user.id}`,
                user.email || `user${user.id}@geonaval.local`,
            ]);
            pasajeroId = nuevoPas.rows[0].id;
        }
        const asiento = `A-${String(viaje.ocupados + 1).padStart(2, '0')}`;
        const metodoPagoFinal = metodo_pago || 'efectivo';
        await pool_1.default.query(`INSERT INTO viaje_pasajeros (viaje_id, pasajero_id, usuario_id, asiento, precio_pagado, metodo_pago)
       VALUES ($1, $2, $3, $4, $5, $6)`, [viajeId, pasajeroId, user.id, asiento, viaje.precio || 0, metodoPagoFinal]);
        return res.status(201).json({ message: 'Inscripción exitosa', asiento });
    }
    catch (err) {
        console.error('Inscribir:', err.message);
        return res.status(500).json({ error: 'No se pudo completar la inscripción' });
    }
});
router.delete('/:id/cancelar-inscripcion', async (req, res) => {
    const user = req.user;
    const viajeId = req.params.id;
    if (!user || user.id === undefined || user.id === null) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    try {
        const viajeRes = await pool_1.default.query('SELECT estado FROM viajes WHERE id = $1', [viajeId]);
        if (!viajeRes.rows[0])
            return res.status(404).json({ error: 'Viaje no encontrado' });
        if (viajeRes.rows[0].estado !== 'programado') {
            return res.status(400).json({ error: 'No se puede cancelar la inscripción si el viaje no está programado' });
        }
        const result = await pool_1.default.query('DELETE FROM viaje_pasajeros WHERE viaje_id = $1 AND usuario_id = $2 RETURNING *', [viajeId, user.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No estás inscrito en este viaje' });
        }
        return res.json({ message: 'Inscripción cancelada' });
    }
    catch (err) {
        console.error('Cancelar inscripción:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.get('/:id/pasajeros', async (req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT p.* FROM pasajeros p
     INNER JOIN viaje_pasajeros vp ON vp.pasajero_id = p.id
     WHERE vp.viaje_id = $1
     ORDER BY p.nombre`, [req.params.id]);
    return res.json(rows);
});
router.post('/:id/pasajeros', async (req, res) => {
    const { pasajero_id, asiento, precio_pagado, usuario_id, metodo_pago } = req.body;
    if (!pasajero_id) {
        return res.status(400).json({ error: 'pasajero_id requerido' });
    }
    try {
        const viaje = await pool_1.default.query('SELECT precio FROM viajes WHERE id = $1', [
            req.params.id,
        ]);
        await pool_1.default.query(`INSERT INTO viaje_pasajeros (viaje_id, pasajero_id, asiento, precio_pagado, usuario_id, metodo_pago)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (viaje_id, pasajero_id) DO UPDATE SET
         asiento = EXCLUDED.asiento,
         precio_pagado = EXCLUDED.precio_pagado,
         metodo_pago = EXCLUDED.metodo_pago`, [
            req.params.id,
            pasajero_id,
            asiento || null,
            precio_pagado ?? viaje.rows[0]?.precio ?? 0,
            usuario_id || null,
            metodo_pago || 'efectivo',
        ]);
        return res.status(201).json({ message: 'Pasajero asignado al viaje' });
    }
    catch (err) {
        console.error('Asignar pasajero:', err.message);
        return res.status(500).json({ error: 'No se pudo asignar el pasajero' });
    }
});
router.get('/:id', async (req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT v.*,
      COUNT(vp.pasajero_id)::int AS pasajeros_count,
      e.nombre AS embarcacion_nombre
     FROM viajes v
     LEFT JOIN viaje_pasajeros vp ON vp.viaje_id = v.id
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     WHERE v.id = $1
     GROUP BY v.id, e.nombre`, [req.params.id]);
    if (!rows[0])
        return res.status(404).json({ error: 'No encontrado' });
    return res.json(rows[0]);
});
router.post('/', async (req, res) => {
    const { fecha_salida, cierre_inscripcion, fecha_limite_inscripcion, origen, destino, embarcacion_id, precio, estado, justificacion_cancelacion, } = req.body;
    if (!fecha_salida || !origen || !destino || !embarcacion_id) {
        return res.status(400).json({
            error: 'Fecha, origen, destino y embarcación son requeridos',
        });
    }
    const user = req.user;
    const cierre = fecha_limite_inscripcion ||
        cierre_inscripcion ||
        new Date(new Date(fecha_salida).getTime() - 2 * 60 * 60 * 1000).toISOString();
    try {
        const result = await pool_1.default.query(`INSERT INTO viajes
        (fecha_salida, cierre_inscripcion, fecha_limite_inscripcion, origen, destino, embarcacion_id, precio, estado, justificacion_cancelacion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [
            fecha_salida,
            cierre,
            cierre,
            origen,
            destino,
            embarcacion_id,
            precio ?? 0,
            estado ?? 'programado',
            justificacion_cancelacion,
            user?.id && user.id > 0 ? user.id : null,
        ]);
        const nuevoViaje = result.rows[0];
        // Notificar a todos los clientes
        try {
            const clientes = await pool_1.default.query("SELECT id FROM usuarios WHERE rol = 'cliente' AND activo = true");
            for (const c of clientes.rows) {
                await pool_1.default.query(`INSERT INTO notificaciones (usuario_id, titulo, mensaje)
           VALUES ($1, $2, $3)`, [
                    c.id,
                    'Nuevo Viaje Disponible',
                    `Se ha programado un nuevo viaje: ${origen} → ${destino} para el día ${new Date(fecha_salida).toLocaleDateString()}. ¡Inscríbete ahora!`
                ]);
            }
        }
        catch (notifErr) {
            console.error('Error enviando notificaciones:', notifErr);
        }
        return res.status(201).json(nuevoViaje);
    }
    catch (err) {
        console.error('POST viaje:', err.message);
        return res.status(500).json({
            error: 'No se pudo crear el viaje. Verifica que la embarcación exista.',
        });
    }
});
router.put('/:id', async (req, res) => {
    const { fecha_salida, cierre_inscripcion, fecha_limite_inscripcion, origen, destino, embarcacion_id, precio, estado, justificacion_cancelacion, } = req.body;
    try {
        const result = await pool_1.default.query(`UPDATE viajes SET
        fecha_salida = COALESCE($1, fecha_salida),
        cierre_inscripcion = COALESCE($2, cierre_inscripcion),
        fecha_limite_inscripcion = COALESCE($3, fecha_limite_inscripcion),
        origen = COALESCE($4, origen),
        destino = COALESCE($5, destino),
        embarcacion_id = COALESCE($6, embarcacion_id),
        precio = COALESCE($7, precio),
        estado = COALESCE($8, estado),
        justificacion_cancelacion = COALESCE($9, justificacion_cancelacion)
       WHERE id = $10
       RETURNING *`, [
            fecha_salida,
            cierre_inscripcion,
            fecha_limite_inscripcion,
            origen,
            destino,
            embarcacion_id,
            precio,
            estado,
            justificacion_cancelacion,
            req.params.id,
        ]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error('PUT viaje:', err.message);
        return res.status(500).json({ error: 'No se pudo actualizar el viaje' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        // Los registros en viaje_pasajeros, viaje_tripulacion, ubicaciones_gps e incidentes
        // ahora tienen ON DELETE CASCADE (o se están actualizando vía migraciones)
        const result = await pool_1.default.query('DELETE FROM viajes WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json({ message: 'Eliminado' });
    }
    catch (err) {
        console.error('DELETE viaje:', err.message);
        return res.status(500).json({ error: 'Error del servidor al eliminar el viaje' });
    }
});
exports.default = router;
