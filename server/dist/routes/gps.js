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
router.get('/viaje/:viajeId', async (req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)('SELECT * FROM ubicaciones_gps WHERE viaje_id = $1 ORDER BY timestamp DESC', [req.params.viajeId]);
    return res.json(rows);
});
router.post('/', async (req, res) => {
    const { viaje_id, latitud, longitud } = req.body;
    try {
        const result = await pool_1.default.query(`INSERT INTO ubicaciones_gps (viaje_id, latitud, longitud)
       VALUES ($1, $2, $3)
       RETURNING *`, [viaje_id, latitud, longitud]);
        return res.status(201).json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
