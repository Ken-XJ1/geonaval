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
router.get('/', async (req, res) => {
    const user = req.user;
    const rows = await (0, safeQuery_1.safeQuery)('SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 50', [user.id]);
    return res.json(rows);
});
router.put('/:id/leida', async (req, res) => {
    const user = req.user;
    try {
        const result = await pool_1.default.query('UPDATE notificaciones SET leida = true WHERE id = $1 AND usuario_id = $2 RETURNING *', [req.params.id, user.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch (err) {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.put('/marcar-todas-leidas', async (req, res) => {
    const user = req.user;
    try {
        await pool_1.default.query('UPDATE notificaciones SET leida = true WHERE usuario_id = $1 AND leida = false', [user.id]);
        return res.json({ message: 'Todas marcadas como leídas' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
