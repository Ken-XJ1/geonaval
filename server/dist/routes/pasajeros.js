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
        const result = await pool_1.default.query('SELECT * FROM pasajeros ORDER BY id');
        return res.json(result.rows);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
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
    const { nombre, documento, telefono, email } = req.body;
    try {
        const result = await pool_1.default.query(`INSERT INTO pasajeros (nombre, documento, telefono, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [nombre, documento, telefono, email]);
        return res.status(201).json(result.rows[0]);
    }
    catch {
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
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('DELETE FROM pasajeros WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json({ message: 'Eliminado' });
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
