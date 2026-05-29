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
const notificaciones_1 = require("../utils/notificaciones");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', async (_req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT id, nombre, email, rol, activo, created_at, 
            cuenta_bloqueada, intentos_fallidos 
     FROM usuarios ORDER BY id`);
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
        await (0, notificaciones_1.auditoria)('[USUARIO] Nuevo usuario creado', `Se creó el usuario "${nombre}" con email ${email} y rol ${rol}.`);
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('POST usuario:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.put('/:id', async (req, res) => {
    const { nombre, email, rol, activo, password } = req.body;
    try {
        // Obtener datos actuales del usuario
        const current = await pool_1.default.query('SELECT nombre, email, rol, activo FROM usuarios WHERE id = $1', [req.params.id]);
        if (!current.rows[0]) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        // Usar valores actuales si no se proporcionan nuevos
        const nombreFinal = nombre ?? current.rows[0].nombre;
        const emailFinal = email ?? current.rows[0].email;
        const rolFinal = rol ?? current.rows[0].rol;
        const activoFinal = activo !== undefined ? activo : current.rows[0].activo;
        let result;
        if (password) {
            const password_hash = await bcryptjs_1.default.hash(password, 10);
            result = await pool_1.default.query(`UPDATE usuarios SET nombre = $1, email = $2, rol = $3, activo = $4, password_hash = $5
         WHERE id = $6
         RETURNING id, nombre, email, rol, activo, created_at`, [nombreFinal, emailFinal, rolFinal, activoFinal, password_hash, req.params.id]);
        }
        else {
            result = await pool_1.default.query(`UPDATE usuarios SET nombre = $1, email = $2, rol = $3, activo = $4
         WHERE id = $5
         RETURNING id, nombre, email, rol, activo, created_at`, [nombreFinal, emailFinal, rolFinal, activoFinal, req.params.id]);
        }
        // Determinar qué cambió para la auditoría
        let accion = 'actualizado';
        if (activo !== undefined && activo !== current.rows[0].activo) {
            accion = activo ? 'activado' : 'suspendido';
        }
        await (0, notificaciones_1.auditoria)('[USUARIO] Usuario modificado', `El usuario "${nombreFinal}" (ID ${req.params.id}) fue ${accion}. Rol: ${rolFinal}.`);
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error('PUT usuario:', err.message);
        return res.status(500).json({ error: `Error del servidor: ${err.message}` });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const info = await pool_1.default.query('SELECT nombre, email, rol FROM usuarios WHERE id = $1', [req.params.id]);
        const result = await pool_1.default.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        if (info.rows[0]) {
            await (0, notificaciones_1.auditoria)('[USUARIO] Usuario eliminado', `Se eliminó el usuario "${info.rows[0].nombre}" (${info.rows[0].email}) con rol ${info.rows[0].rol}.`);
        }
        return res.json({ message: 'Eliminado' });
    }
    catch (err) {
        console.error('DELETE usuario:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
