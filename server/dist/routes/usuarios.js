"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pool_1 = __importDefault(require("../db/pool"));
const safeQuery_1 = require("../db/safeQuery");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', async (_req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)('SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY id');
    return res.json(rows);
});
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('SELECT id, nombre, email, rol, activo, created_at FROM usuarios WHERE id = $1', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.post('/', async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    try {
        const password_hash = await bcryptjs_1.default.hash(password, 10);
        const result = await pool_1.default.query(`INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, activo, created_at`, [nombre, email, password_hash, rol]);
        return res.status(201).json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.put('/:id', async (req, res) => {
    const { nombre, email, rol, activo, password } = req.body;
    try {
        if (password) {
            const password_hash = await bcryptjs_1.default.hash(password, 10);
            const result = await pool_1.default.query(`UPDATE usuarios SET nombre = $1, email = $2, rol = $3, activo = $4, password_hash = $5
         WHERE id = $6
         RETURNING id, nombre, email, rol, activo, created_at`, [nombre, email, rol, activo ?? true, password_hash, req.params.id]);
            if (!result.rows[0])
                return res.status(404).json({ error: 'No encontrado' });
            return res.json(result.rows[0]);
        }
        const result = await pool_1.default.query(`UPDATE usuarios SET nombre = $1, email = $2, rol = $3, activo = $4
       WHERE id = $5
       RETURNING id, nombre, email, rol, activo, created_at`, [nombre, email, rol, activo ?? true, req.params.id]);
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
        const result = await pool_1.default.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json({ message: 'Eliminado' });
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
