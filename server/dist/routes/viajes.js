"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const safeQuery_1 = require("../db/safeQuery");
const auth_1 = require("../middleware/auth");
const notificaciones_1 = require("../utils/notificaciones");
const timeService_1 = require("../utils/timeService");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
const VIAJES_LIST_SQL = `
  SELECT v.*,
    COUNT(vp.pasajero_id)::int AS pasajeros_count,
    e.nombre AS embarcacion_nombre,
    e.capacidad_pasajeros,
    pr.nombre AS propietario_nombre,
    (
      SELECT t.nombre
      FROM viaje_tripulacion vt
      INNER JOIN tripulacion t ON t.id = vt.tripulante_id
      WHERE vt.viaje_id = v.id
      ORDER BY CASE t.rol
        WHEN 'capitan' THEN 0
        WHEN 'copiloto' THEN 1
        ELSE 2
      END, t.id
      LIMIT 1
    ) AS operador_nombre
  FROM viajes v
  LEFT JOIN viaje_pasajeros vp ON vp.viaje_id = v.id
  LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
  LEFT JOIN propietarios pr ON pr.id = e.propietario_id
  GROUP BY v.id, e.nombre, e.capacidad_pasajeros, pr.nombre
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
        // Notificar a los administradores sobre la inscripción
        await (0, notificaciones_1.notificarAdministradores)('Nueva Inscripción a Viaje', `${user.nombre} se ha inscrito al viaje ${viaje.origen} → ${viaje.destino} (${(0, notificaciones_1.formatearFechaColombia)(viaje.fecha_salida)}). Asiento: ${asiento}`);
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
        // Obtener información del viaje para la notificación
        const viajeInfo = viajeRes.rows[0];
        const viajeDetalle = await pool_1.default.query('SELECT origen, destino, fecha_salida FROM viajes WHERE id = $1', [viajeId]);
        if (viajeDetalle.rows[0]) {
            const v = viajeDetalle.rows[0];
            await (0, notificaciones_1.notificarAdministradores)('Cancelación de Inscripción', `${user.nombre} ha cancelado su inscripción al viaje ${v.origen} → ${v.destino} (${(0, notificaciones_1.formatearFechaColombia)(v.fecha_salida)})`);
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
        const viaje = await pool_1.default.query(`SELECT v.precio, v.embarcacion_id, e.nombre AS embarcacion_nombre, e.estado AS embarcacion_estado
       FROM viajes v
       LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE v.id = $1`, [req.params.id]);
        if (!viaje.rows[0]) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }
        // Verificar que la embarcación no esté fuera de servicio
        if (viaje.rows[0].embarcacion_estado === 'fuera_servicio') {
            return res.status(400).json({
                error: `No se puede asignar pasajeros. La embarcación "${viaje.rows[0].embarcacion_nombre}" está fuera de servicio`,
            });
        }
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
        // Auditoría de inscripción
        const pasInfo = await pool_1.default.query('SELECT nombre, documento FROM pasajeros WHERE id = $1', [pasajero_id]);
        const vInfo = await pool_1.default.query('SELECT origen, destino FROM viajes WHERE id = $1', [req.params.id]);
        if (pasInfo.rows[0] && vInfo.rows[0]) {
            await (0, notificaciones_1.auditoria)('[PASAJERO] Pasajero inscrito en viaje', `${pasInfo.rows[0].nombre} (doc: ${pasInfo.rows[0].documento}) fue inscrito en el viaje V-${req.params.id} (${vInfo.rows[0].origen} → ${vInfo.rows[0].destino}). Asiento: ${asiento || 'auto'}, Pago: ${metodo_pago || 'efectivo'}.`);
        }
        return res.status(201).json({ message: 'Pasajero asignado al viaje' });
    }
    catch (err) {
        console.error('Asignar pasajero:', err.message);
        return res.status(500).json({ error: 'No se pudo asignar el pasajero' });
    }
});
router.post('/:id/tripulacion', async (req, res) => {
    const { tripulante_id } = req.body;
    if (!tripulante_id) {
        return res.status(400).json({ error: 'tripulante_id requerido' });
    }
    try {
        const viaje = await pool_1.default.query(`SELECT v.id, v.embarcacion_id, e.nombre AS embarcacion_nombre, e.estado AS embarcacion_estado
       FROM viajes v
       LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE v.id = $1`, [req.params.id]);
        if (!viaje.rows[0]) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }
        // Verificar que la embarcación no esté fuera de servicio
        if (viaje.rows[0].embarcacion_estado === 'fuera_servicio') {
            return res.status(400).json({
                error: `No se puede asignar tripulación. La embarcación "${viaje.rows[0].embarcacion_nombre}" está fuera de servicio`,
            });
        }
        await pool_1.default.query(`INSERT INTO viaje_tripulacion (viaje_id, tripulante_id)
       VALUES ($1, $2)
       ON CONFLICT (viaje_id, tripulante_id) DO NOTHING`, [req.params.id, tripulante_id]);
        const operador = await pool_1.default.query(`SELECT t.nombre FROM tripulacion t WHERE t.id = $1`, [tripulante_id]);
        return res.status(201).json({
            message: 'Operador asignado al viaje',
            operador_nombre: operador.rows[0]?.nombre || null,
        });
    }
    catch (err) {
        console.error('Asignar tripulación:', err.message);
        return res.status(500).json({ error: 'No se pudo asignar el operador' });
    }
});
router.get('/:id', async (req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT v.*,
      COUNT(vp.pasajero_id)::int AS pasajeros_count,
      e.nombre AS embarcacion_nombre,
      pr.nombre AS propietario_nombre,
      (
        SELECT t.nombre
        FROM viaje_tripulacion vt
        INNER JOIN tripulacion t ON t.id = vt.tripulante_id
        WHERE vt.viaje_id = v.id
        ORDER BY CASE t.rol
          WHEN 'capitan' THEN 0
          WHEN 'copiloto' THEN 1
          ELSE 2
        END, t.id
        LIMIT 1
      ) AS operador_nombre
     FROM viajes v
     LEFT JOIN viaje_pasajeros vp ON vp.viaje_id = v.id
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     LEFT JOIN propietarios pr ON pr.id = e.propietario_id
     WHERE v.id = $1
     GROUP BY v.id, e.nombre, pr.nombre`, [req.params.id]);
    if (!rows[0])
        return res.status(404).json({ error: 'No encontrado' });
    return res.json(rows[0]);
});
router.post('/', async (req, res) => {
    const { fecha_salida, fecha_llegada, cierre_inscripcion, fecha_limite_inscripcion, origen, destino, embarcacion_id, precio, estado, justificacion_cancelacion, tripulante_id, } = req.body;
    if (!fecha_salida || !origen || !destino || !embarcacion_id) {
        return res.status(400).json({
            error: 'Fecha, origen, destino y embarcación son requeridos',
        });
    }
    // Validar que la fecha de salida no sea en el pasado (hora de Colombia desde WorldTimeAPI)
    try {
        const ahoraColombia = await (0, timeService_1.getColombiaTime)();
        const fechaSalidaDate = new Date(fecha_salida);
        if (fechaSalidaDate < ahoraColombia) {
            return res.status(400).json({
                error: 'No se puede crear un viaje con fecha de salida en el pasado',
            });
        }
    }
    catch (err) {
        console.error('Error validando fecha:', err.message);
        return res.status(500).json({ error: 'Error al validar la fecha' });
    }
    const user = req.user;
    const cierre = fecha_limite_inscripcion ||
        cierre_inscripcion ||
        new Date(new Date(fecha_salida).getTime() - 2 * 60 * 60 * 1000).toISOString();
    try {
        // Verificar que la embarcación no esté fuera de servicio
        const embRes = await pool_1.default.query('SELECT estado, nombre FROM embarcaciones WHERE id = $1', [embarcacion_id]);
        if (!embRes.rows[0]) {
            return res.status(404).json({ error: 'Embarcación no encontrada' });
        }
        if (embRes.rows[0].estado === 'fuera_servicio') {
            return res.status(400).json({
                error: `La embarcación "${embRes.rows[0].nombre}" está fuera de servicio y no puede ser asignada a un viaje`,
            });
        }
        // Prevenir duplicación: verificar si ya existe un viaje con misma ruta, fecha y embarcación
        const duplicadoRes = await pool_1.default.query(`SELECT id FROM viajes 
       WHERE origen = $1 
       AND destino = $2 
       AND embarcacion_id = $3 
       AND fecha_salida = $4
       AND estado != 'cancelado'`, [origen, destino, embarcacion_id, fecha_salida]);
        if (duplicadoRes.rows.length > 0) {
            return res.status(400).json({
                error: 'Ya existe un viaje programado con la misma ruta, fecha y embarcación. Por favor verifica los viajes existentes.',
            });
        }
        const result = await pool_1.default.query(`INSERT INTO viajes
        (fecha_salida, fecha_llegada, cierre_inscripcion, fecha_limite_inscripcion, origen, destino, embarcacion_id, precio, estado, justificacion_cancelacion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [
            fecha_salida,
            fecha_llegada || null,
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
        if (tripulante_id) {
            await pool_1.default.query(`INSERT INTO viaje_tripulacion (viaje_id, tripulante_id)
         VALUES ($1, $2)
         ON CONFLICT (viaje_id, tripulante_id) DO NOTHING`, [nuevoViaje.id, tripulante_id]);
        }
        // Notificar a todos los clientes sobre el nuevo viaje
        await (0, notificaciones_1.notificarClientes)('Nuevo Viaje Disponible', `Se ha programado un nuevo viaje: ${origen} → ${destino} para el ${(0, notificaciones_1.formatearFechaColombia)(fecha_salida)}. ¡Inscríbete ahora!`);
        // Auditoría
        await (0, notificaciones_1.auditoria)('[VIAJE] Nuevo viaje programado', `Se programó el viaje V-${nuevoViaje.id}: ${origen} → ${destino} para el ${(0, notificaciones_1.formatearFechaColombia)(fecha_salida)}. Precio: $${precio ?? 0}.`);
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
    const { fecha_salida, fecha_llegada, cierre_inscripcion, fecha_limite_inscripcion, origen, destino, embarcacion_id, precio, estado, justificacion_cancelacion, } = req.body;
    try {
        // Obtener el viaje anterior para comparar cambios
        const viajeAnterior = await pool_1.default.query('SELECT * FROM viajes WHERE id = $1', [req.params.id]);
        if (!viajeAnterior.rows[0]) {
            return res.status(404).json({ error: 'No encontrado' });
        }
        // Si se está cambiando la embarcación, verificar que no esté fuera de servicio
        if (embarcacion_id && embarcacion_id !== viajeAnterior.rows[0].embarcacion_id) {
            const embRes = await pool_1.default.query('SELECT estado, nombre FROM embarcaciones WHERE id = $1', [embarcacion_id]);
            if (!embRes.rows[0]) {
                return res.status(404).json({ error: 'Embarcación no encontrada' });
            }
            if (embRes.rows[0].estado === 'fuera_servicio') {
                return res.status(400).json({
                    error: `La embarcación "${embRes.rows[0].nombre}" está fuera de servicio y no puede ser asignada a un viaje`,
                });
            }
        }
        const result = await pool_1.default.query(`UPDATE viajes SET
        fecha_salida = COALESCE($1, fecha_salida),
        fecha_llegada = COALESCE($2, fecha_llegada),
        cierre_inscripcion = COALESCE($3, cierre_inscripcion),
        fecha_limite_inscripcion = COALESCE($4, fecha_limite_inscripcion),
        origen = COALESCE($5, origen),
        destino = COALESCE($6, destino),
        embarcacion_id = COALESCE($7, embarcacion_id),
        precio = COALESCE($8, precio),
        estado = COALESCE($9, estado),
        justificacion_cancelacion = COALESCE($10, justificacion_cancelacion)
       WHERE id = $11
       RETURNING *`, [
            fecha_salida,
            fecha_llegada ?? null,
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
        const viajeActualizado = result.rows[0];
        const viajeAnteriorData = viajeAnterior.rows[0];
        // Notificar a los pasajeros inscritos sobre cambios importantes
        let cambios = [];
        if (estado && estado !== viajeAnteriorData.estado) {
            if (estado === 'cancelado') {
                const razon = justificacion_cancelacion || 'No especificada';
                await (0, notificaciones_1.notificarPasajerosViaje)(Number(req.params.id), 'Viaje Cancelado', `El viaje ${viajeActualizado.origen} → ${viajeActualizado.destino} (${(0, notificaciones_1.formatearFechaColombia)(viajeActualizado.fecha_salida)}) ha sido cancelado. Razón: ${razon}`);
                await (0, notificaciones_1.auditoria)('[VIAJE] Viaje cancelado', `El viaje V-${req.params.id} (${viajeActualizado.origen} → ${viajeActualizado.destino}, ${(0, notificaciones_1.formatearFechaColombia)(viajeActualizado.fecha_salida)}) fue CANCELADO. Razón: ${razon}`);
                cambios.push('cancelado');
            }
            else if (estado === 'en_curso') {
                await (0, notificaciones_1.notificarPasajerosViaje)(Number(req.params.id), 'Viaje Iniciado', `El viaje ${viajeActualizado.origen} → ${viajeActualizado.destino} ha iniciado. ¡Buen viaje!`);
                await (0, notificaciones_1.auditoria)('[VIAJE] Viaje iniciado — EN CURSO', `El viaje V-${req.params.id} (${viajeActualizado.origen} → ${viajeActualizado.destino}) fue INICIADO. El GPS comenzará a registrar el recorrido.`);
                cambios.push('iniciado');
            }
            else if (estado === 'finalizado') {
                await (0, notificaciones_1.notificarPasajerosViaje)(Number(req.params.id), 'Viaje Finalizado', `El viaje ${viajeActualizado.origen} → ${viajeActualizado.destino} ha finalizado exitosamente.`);
                await (0, notificaciones_1.auditoria)('[VIAJE] Viaje finalizado', `El viaje V-${req.params.id} (${viajeActualizado.origen} → ${viajeActualizado.destino}) fue FINALIZADO exitosamente.`);
                cambios.push('finalizado');
            }
        }
        if (fecha_salida && fecha_salida !== viajeAnteriorData.fecha_salida) {
            await (0, notificaciones_1.notificarPasajerosViaje)(Number(req.params.id), 'Cambio de Fecha de Viaje', `La fecha del viaje ${viajeActualizado.origen} → ${viajeActualizado.destino} ha cambiado a ${(0, notificaciones_1.formatearFechaColombia)(fecha_salida)}`);
            cambios.push('fecha modificada');
        }
        if (origen && origen !== viajeAnteriorData.origen) {
            cambios.push('origen modificado');
        }
        if (destino && destino !== viajeAnteriorData.destino) {
            cambios.push('destino modificado');
        }
        if (precio !== undefined && precio !== viajeAnteriorData.precio) {
            cambios.push('precio modificado');
        }
        // Si hubo cambios generales, notificar a los pasajeros
        if (cambios.length > 0 && !cambios.includes('cancelado') && !cambios.includes('iniciado')) {
            await (0, notificaciones_1.notificarPasajerosViaje)(Number(req.params.id), 'Viaje Modificado', `El viaje ${viajeActualizado.origen} → ${viajeActualizado.destino} (${(0, notificaciones_1.formatearFechaColombia)(viajeActualizado.fecha_salida)}) ha sido modificado. Cambios: ${cambios.join(', ')}`);
        }
        return res.json(viajeActualizado);
    }
    catch (err) {
        console.error('PUT viaje:', err.message);
        return res.status(500).json({ error: 'No se pudo actualizar el viaje' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        // Obtener información del viaje antes de eliminarlo
        const viajeInfo = await pool_1.default.query('SELECT origen, destino, fecha_salida FROM viajes WHERE id = $1', [req.params.id]);
        if (!viajeInfo.rows[0]) {
            return res.status(404).json({ error: 'No encontrado' });
        }
        const viaje = viajeInfo.rows[0];
        // Notificar a los pasajeros inscritos antes de eliminar
        await (0, notificaciones_1.notificarPasajerosViaje)(Number(req.params.id), 'Viaje Eliminado', `El viaje ${viaje.origen} → ${viaje.destino} (${(0, notificaciones_1.formatearFechaColombia)(viaje.fecha_salida)}) ha sido eliminado del sistema`);
        await (0, notificaciones_1.auditoria)('[VIAJE] Viaje eliminado', `Se eliminó el viaje V-${req.params.id} (${viaje.origen} → ${viaje.destino}, ${(0, notificaciones_1.formatearFechaColombia)(viaje.fecha_salida)}) del sistema.`);
        // Los registros en viaje_pasajeros, viaje_tripulacion, ubicaciones_gps e incidentes
        // ahora tienen ON DELETE CASCADE (o se están actualizando vía migraciones)
        const result = await pool_1.default.query('DELETE FROM viajes WHERE id = $1 RETURNING id', [req.params.id]);
        return res.json({ message: 'Eliminado' });
    }
    catch (err) {
        console.error('DELETE viaje:', err.message);
        return res.status(500).json({ error: 'Error del servidor al eliminar el viaje' });
    }
});
exports.default = router;
