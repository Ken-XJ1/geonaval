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
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', async (_req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT DISTINCT ON (p.id, vp.viaje_id) p.*,
      vp.viaje_id,
      vp.asiento,
      vp.precio_pagado,
      vp.metodo_pago,
      v.origen,
      v.destino,
      v.estado AS viaje_estado,
      v.fecha_salida AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota' AS fecha_salida,
      v.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota' AS fecha_compra,
      e.nombre AS embarcacion_nombre
     FROM pasajeros p
     LEFT JOIN viaje_pasajeros vp ON vp.pasajero_id = p.id
     LEFT JOIN viajes v ON v.id = vp.viaje_id
     LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
     ORDER BY p.id DESC, vp.viaje_id DESC, v.fecha_salida DESC NULLS LAST`);
    return res.json(rows);
});
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('SELECT * FROM pasajeros WHERE id = $1', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.post('/', async (req, res) => {
    const { nombre, documento, telefono, email, viaje_id, asiento, precio, metodo_pago } = req.body;
    try {
        // Si viene viaje_id, crear pasajero y asignarlo al viaje en una transacción
        if (viaje_id) {
            const client = await pool_1.default.connect();
            try {
                await client.query('BEGIN');
                // Crear pasajero
                const pasajeroResult = await client.query(`INSERT INTO pasajeros (nombre, documento, telefono, email)
           VALUES ($1, $2, $3, $4)
           RETURNING *`, [nombre, documento, telefono, email]);
                const pasajero = pasajeroResult.rows[0];
                // Asignar al viaje
                await client.query(`INSERT INTO viaje_pasajeros (viaje_id, pasajero_id, asiento, precio_pagado, metodo_pago)
           VALUES ($1, $2, $3, $4, $5)`, [viaje_id, pasajero.id, asiento, precio, metodo_pago || 'efectivo']);
                await client.query('COMMIT');
                await (0, notificaciones_1.auditoria)('[COMPRA] Nueva compra de pasaje', `Pasajero "${nombre}" compró pasaje para viaje #${viaje_id}. Método: ${metodo_pago}. Precio: $${precio}.`);
                return res.status(201).json(pasajero);
            }
            catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
            finally {
                client.release();
            }
        }
        else {
            // Solo crear pasajero sin asignar a viaje
            const result = await pool_1.default.query(`INSERT INTO pasajeros (nombre, documento, telefono, email)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [nombre, documento, telefono, email]);
            await (0, notificaciones_1.auditoria)('[PASAJERO] Nuevo pasajero registrado', `Se registró al pasajero "${nombre}" con documento ${documento}.`);
            return res.status(201).json(result.rows[0]);
        }
    }
    catch (err) {
        console.error('POST pasajero:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.put('/:id', async (req, res) => {
    const { nombre, documento, telefono, email } = req.body;
    try {
        const result = await pool_1.default.query(`UPDATE pasajeros SET
        nombre = $1, documento = $2, telefono = $3, email = $4
       WHERE id = $5
       RETURNING *`, [nombre, documento, telefono, email, req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        await (0, notificaciones_1.auditoria)('[PASAJERO] Pasajero modificado', `Se actualizaron los datos del pasajero "${nombre}" (doc: ${documento}).`);
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error('PUT pasajero:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const info = await pool_1.default.query('SELECT nombre, documento FROM pasajeros WHERE id = $1', [req.params.id]);
        const result = await pool_1.default.query('DELETE FROM pasajeros WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        if (info.rows[0]) {
            await (0, notificaciones_1.auditoria)('[PASAJERO] Pasajero eliminado', `Se eliminó al pasajero "${info.rows[0].nombre}" (doc: ${info.rows[0].documento}).`);
        }
        return res.json({ message: 'Eliminado' });
    }
    catch (err) {
        console.error('DELETE pasajero:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
