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
// Recorrido completo de un viaje
router.get('/viaje/:viajeId', async (req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)('SELECT * FROM ubicaciones_gps WHERE viaje_id = $1 ORDER BY timestamp ASC', [req.params.viajeId]);
    return res.json(rows);
});
// Última posición de todos los viajes en curso
router.get('/en-curso', async (_req, res) => {
    try {
        const rows = await pool_1.default.query(`
      SELECT DISTINCT ON (v.id)
        v.id AS viaje_id,
        v.origen,
        v.destino,
        v.estado,
        e.nombre AS embarcacion_nombre,
        u.latitud,
        u.longitud,
        u.timestamp
      FROM viajes v
      LEFT JOIN embarcaciones e ON e.id = v.embarcacion_id
      LEFT JOIN ubicaciones_gps u ON u.viaje_id = v.id
      WHERE v.estado = 'en_curso'
      ORDER BY v.id, u.timestamp DESC
    `);
        return res.json(rows.rows);
    }
    catch (err) {
        console.error('GPS en-curso:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
// Guardar nueva posición GPS
router.post('/', async (req, res) => {
    const { viaje_id, latitud, longitud } = req.body;
    if (!viaje_id || latitud === undefined || longitud === undefined) {
        return res.status(400).json({ error: 'viaje_id, latitud y longitud son requeridos' });
    }
    try {
        const result = await pool_1.default.query(`INSERT INTO ubicaciones_gps (viaje_id, latitud, longitud)
       VALUES ($1, $2, $3)
       RETURNING *`, [viaje_id, latitud, longitud]);
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('GPS post:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
