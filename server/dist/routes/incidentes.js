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
router.get('/', async (_req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT i.*, v.origen, v.destino
     FROM incidentes i
     LEFT JOIN viajes v ON v.id = i.viaje_id
     ORDER BY i.created_at DESC`);
    return res.json(rows);
});
router.post('/', async (req, res) => {
    const { viaje_id, tipo, descripcion, severidad, reportado_por } = req.body;
    if (!tipo || !descripcion) {
        return res.status(400).json({ error: 'Tipo y descripción son requeridos' });
    }
    try {
        const user = req.user;
        const result = await pool_1.default.query(`INSERT INTO incidentes (viaje_id, tipo, descripcion, severidad, reportado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            viaje_id || null,
            tipo,
            descripcion,
            severidad || 'media',
            reportado_por || user?.nombre || 'Operador',
        ]);
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('POST incidente:', err.message);
        return res.status(500).json({
            error: 'No se pudo registrar el incidente. Intenta de nuevo.',
        });
    }
});
exports.default = router;
