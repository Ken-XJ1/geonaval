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
router.get('/:id/pasajeros', async (req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT p.* FROM pasajeros p
     INNER JOIN viaje_pasajeros vp ON vp.pasajero_id = p.id
     WHERE vp.viaje_id = $1
     ORDER BY p.nombre`, [req.params.id]);
    return res.json(rows);
});
router.post('/:id/pasajeros', async (req, res) => {
    const { pasajero_id } = req.body;
    if (!pasajero_id) {
        return res.status(400).json({ error: 'pasajero_id requerido' });
    }
    try {
        await pool_1.default.query(`INSERT INTO viaje_pasajeros (viaje_id, pasajero_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, [req.params.id, pasajero_id]);
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
    const { fecha_salida, origen, destino, embarcacion_id, estado, justificacion_cancelacion, } = req.body;
    if (!fecha_salida || !origen || !destino || !embarcacion_id) {
        return res.status(400).json({
            error: 'Fecha, origen, destino y embarcación son requeridos',
        });
    }
    try {
        const result = await pool_1.default.query(`INSERT INTO viajes
        (fecha_salida, origen, destino, embarcacion_id, estado, justificacion_cancelacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [
            fecha_salida,
            origen,
            destino,
            embarcacion_id,
            estado ?? 'programado',
            justificacion_cancelacion,
        ]);
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('POST viaje:', err.message);
        return res.status(500).json({
            error: 'No se pudo crear el viaje. Verifica que la embarcación exista.',
        });
    }
});
router.put('/:id', async (req, res) => {
    const { fecha_salida, origen, destino, embarcacion_id, estado, justificacion_cancelacion, } = req.body;
    try {
        const result = await pool_1.default.query(`UPDATE viajes SET
        fecha_salida = COALESCE($1, fecha_salida),
        origen = COALESCE($2, origen),
        destino = COALESCE($3, destino),
        embarcacion_id = COALESCE($4, embarcacion_id),
        estado = COALESCE($5, estado),
        justificacion_cancelacion = COALESCE($6, justificacion_cancelacion)
       WHERE id = $7
       RETURNING *`, [
            fecha_salida,
            origen,
            destino,
            embarcacion_id,
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
        const result = await pool_1.default.query('DELETE FROM viajes WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json({ message: 'Eliminado' });
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
