"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', async (_req, res) => {
    try {
        const result = await pool_1.default.query('SELECT * FROM viajes ORDER BY fecha_salida DESC');
        return res.json(result.rows);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('SELECT * FROM viajes WHERE id = $1', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.post('/', async (req, res) => {
    const { fecha_salida, origen, destino, embarcacion_id, estado, justificacion_cancelacion, } = req.body;
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
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.put('/:id', async (req, res) => {
    const { fecha_salida, origen, destino, embarcacion_id, estado, justificacion_cancelacion, } = req.body;
    try {
        const result = await pool_1.default.query(`UPDATE viajes SET
        fecha_salida = $1, origen = $2, destino = $3, embarcacion_id = $4,
        estado = $5, justificacion_cancelacion = $6
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
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
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
