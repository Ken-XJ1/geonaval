"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pool_1 = __importDefault(require("../db/pool"));
const cuenta_1 = require("./cuenta");
const notificaciones_1 = require("../utils/notificaciones");
const router = (0, express_1.Router)();
const MAX_INTENTOS = 3; // Intentos antes de bloquear
/** Cuentas de prueba — funcionan aunque PostgreSQL no esté disponible */
const DEMO_ACCOUNTS = [
    { email: 'test@test.com', password: '123456', id: 0, nombre: 'Usuario Prueba', rol: 'administrador' },
    { email: 'admin@geonaval.com', password: 'admin123', id: 1, nombre: 'Administrador GeoNaval', rol: 'administrador' },
    { email: 'operador@geonaval.com', password: 'operador123', id: 2, nombre: 'Operador 1', rol: 'operador' },
    { email: 'autoridad@geonaval.com', password: 'autoridad123', id: 4, nombre: 'Autoridad Demo', rol: 'autoridad' },
];
function signToken(user) {
    const token = jsonwebtoken_1.default.sign({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    return { token, rol: user.rol, nombre: user.nombre, id: user.id, email: user.email };
}
function findDemoAccount(email, password) {
    return DEMO_ACCOUNTS.find((a) => a.email === email?.trim().toLowerCase() && a.password === password);
}
router.post('/login', async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    // Cuentas demo (no tienen bloqueo)
    const demo = findDemoAccount(email, password);
    if (demo) {
        const payload = signToken({ ...demo, email });
        (0, cuenta_1.recordLoginSession)({ id: demo.id, email }, req);
        return res.json(payload);
    }
    try {
        const result = await pool_1.default.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Verificar si la cuenta está bloqueada
        if (user.cuenta_bloqueada) {
            await (0, notificaciones_1.auditoria)('[USUARIO] Intento de acceso a cuenta bloqueada', `Se intentó acceder a la cuenta bloqueada de "${user.nombre}" (${user.email}).`);
            return res.status(403).json({
                error: 'Cuenta bloqueada por múltiples intentos fallidos. Contacta al administrador.',
                bloqueada: true,
            });
        }
        // Verificar si está inactivo
        if (!user.activo) {
            return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            // Solo bloquear cuentas que NO son administrador
            if (user.rol !== 'administrador') {
                const nuevosIntentos = (user.intentos_fallidos || 0) + 1;
                const bloquear = nuevosIntentos >= MAX_INTENTOS;
                await pool_1.default.query(`UPDATE usuarios SET
            intentos_fallidos = $1,
            cuenta_bloqueada = $2
           WHERE id = $3`, [bloquear ? 0 : nuevosIntentos, bloquear, user.id]);
                if (bloquear) {
                    await (0, notificaciones_1.auditoria)('[USUARIO] Cuenta bloqueada por intentos fallidos', `La cuenta de "${user.nombre}" (${user.email}, rol: ${user.rol}) fue BLOQUEADA automáticamente tras ${MAX_INTENTOS} intentos fallidos de inicio de sesión.`);
                    return res.status(403).json({
                        error: `Cuenta bloqueada por ${MAX_INTENTOS} intentos fallidos. Contacta al administrador.`,
                        bloqueada: true,
                    });
                }
                const restantes = MAX_INTENTOS - nuevosIntentos;
                return res.status(401).json({
                    error: `Contraseña incorrecta. Te quedan ${restantes} intento${restantes !== 1 ? 's' : ''} antes de que tu cuenta sea bloqueada.`,
                    intentosRestantes: restantes,
                });
            }
            // Administrador: solo error simple, sin bloqueo
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Login exitoso — resetear intentos fallidos
        await pool_1.default.query(`UPDATE usuarios SET intentos_fallidos = 0, ultimo_acceso = NOW() WHERE id = $1`, [user.id]);
        const payload = signToken({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email });
        (0, cuenta_1.recordLoginSession)({ id: user.id, email: user.email }, req);
        return res.json(payload);
    }
    catch (err) {
        console.error('Login error:', err);
        return res.status(503).json({ error: 'Base de datos no disponible. Usa: test@test.com / 123456' });
    }
});
/** Desbloquear cuenta — solo administradores */
router.post('/desbloquear/:id', async (req, res) => {
    // Verificar token de admin
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'No autorizado' });
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded.rol !== 'administrador') {
            return res.status(403).json({ error: 'Solo los administradores pueden desbloquear cuentas' });
        }
        const userId = parseInt(req.params.id);
        const userRes = await pool_1.default.query('SELECT nombre, email, rol FROM usuarios WHERE id = $1', [userId]);
        if (!userRes.rows[0])
            return res.status(404).json({ error: 'Usuario no encontrado' });
        const usuario = userRes.rows[0];
        // No se puede desbloquear a otro administrador (no debería estar bloqueado)
        if (usuario.rol === 'administrador') {
            return res.status(400).json({ error: 'Las cuentas de administrador no pueden ser bloqueadas ni desbloqueadas' });
        }
        await pool_1.default.query(`UPDATE usuarios SET cuenta_bloqueada = false, intentos_fallidos = 0 WHERE id = $1`, [userId]);
        await (0, notificaciones_1.auditoria)('[USUARIO] Cuenta desbloqueada por administrador', `El administrador "${decoded.nombre}" desbloqueó la cuenta de "${usuario.nombre}" (${usuario.email}, rol: ${usuario.rol}).`);
        return res.json({ message: `Cuenta de ${usuario.nombre} desbloqueada exitosamente` });
    }
    catch (err) {
        console.error('Desbloquear:', err);
        return res.status(500).json({ error: 'Error al desbloquear la cuenta' });
    }
});
exports.default = router;
