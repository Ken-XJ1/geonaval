"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordLoginSession = recordLoginSession;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
const DEFAULT_PREFS = {
    idioma: 'es',
    zona_horaria: 'America/Bogota',
    formato_fecha: 'DD/MM/YYYY',
    tema: 'claro',
};
const DEMO_PASSWORDS = {
    'test@test.com': '123456',
    'admin@geonaval.com': 'admin123',
    'operador@geonaval.com': 'operador123',
    'cliente@geonaval.com': 'cliente123',
    'autoridad@geonaval.com': 'autoridad123',
};
const demoPrefs = new Map();
const demoSessions = new Map();
const demoProfiles = new Map();
const demoPasswords = new Map();
let demoSessionCounter = 1;
function getUser(req) {
    return req.user;
}
async function resolveContext(user) {
    if (user.id > 0) {
        try {
            const dbUser = await getDbUser(user.id);
            if (dbUser)
                return { mode: 'db', dbUser };
        }
        catch {
            /* fallback demo */
        }
    }
    if (user.email) {
        return { mode: 'demo', email: user.email.toLowerCase() };
    }
    return null;
}
function recordDemoSession(email, userAgent, ip) {
    const list = demoSessions.get(email) || [];
    list.unshift({
        id: demoSessionCounter++,
        user_agent: userAgent,
        ip_address: ip,
        exito: true,
        created_at: new Date().toISOString(),
    });
    demoSessions.set(email, list.slice(0, 20));
}
function recordLoginSession(user, req) {
    const ua = String(req.headers['user-agent'] || 'Navegador web');
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '—';
    if (user.id > 0 && user.email) {
        pool_1.default
            .query(`INSERT INTO sesiones_usuario (usuario_id, user_agent, ip_address, exito)
         VALUES ($1, $2, $3, true)`, [user.id, ua, ip])
            .catch(() => undefined);
        pool_1.default
            .query(`UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1`, [
            user.id,
        ])
            .catch(() => undefined);
    }
    else if (user.email) {
        recordDemoSession(user.email, ua, ip);
    }
}
async function getDbUser(userId) {
    const result = await pool_1.default.query('SELECT id, nombre, email, rol, created_at, ultimo_acceso FROM usuarios WHERE id = $1', [userId]);
    return result.rows[0];
}
async function getPreferencias(userId) {
    const result = await pool_1.default.query('SELECT idioma, zona_horaria, formato_fecha, tema FROM usuario_preferencias WHERE usuario_id = $1', [userId]);
    return result.rows[0] || DEFAULT_PREFS;
}
router.get('/perfil', async (req, res) => {
    const user = getUser(req);
    const ctx = await resolveContext(user);
    if (!ctx)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    if (ctx.mode === 'demo') {
        const profile = demoProfiles.get(ctx.email);
        const sessions = demoSessions.get(ctx.email) || [];
        return res.json({
            id: user.id,
            nombre: profile?.nombre || user.nombre,
            email: profile?.email || ctx.email,
            rol: user.rol,
            created_at: null,
            ultimo_acceso: sessions[0]?.created_at || null,
            preferencias: demoPrefs.get(ctx.email) || DEFAULT_PREFS,
        });
    }
    try {
        const preferencias = await getPreferencias(ctx.dbUser.id);
        return res.json({ ...ctx.dbUser, preferencias });
    }
    catch {
        return res.status(500).json({ error: 'Error al cargar perfil' });
    }
});
router.put('/perfil', async (req, res) => {
    const user = getUser(req);
    const { nombre, email } = req.body;
    if (!nombre?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    const emailNorm = email.trim().toLowerCase();
    const ctx = await resolveContext(user);
    if (!ctx)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    if (ctx.mode === 'demo') {
        demoProfiles.set(ctx.email, {
            nombre: nombre.trim(),
            email: emailNorm,
        });
        return res.json({
            id: user.id,
            nombre: nombre.trim(),
            email: emailNorm,
            rol: user.rol,
        });
    }
    try {
        const exists = await pool_1.default.query('SELECT id FROM usuarios WHERE LOWER(email) = $1 AND id <> $2', [emailNorm, ctx.dbUser.id]);
        if (exists.rows[0]) {
            return res.status(400).json({ error: 'Ese email ya está en uso' });
        }
        const result = await pool_1.default.query(`UPDATE usuarios SET nombre = $1, email = $2 WHERE id = $3
       RETURNING id, nombre, email, rol, created_at, ultimo_acceso`, [nombre.trim(), emailNorm, ctx.dbUser.id]);
        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});
router.get('/preferencias', async (req, res) => {
    const user = getUser(req);
    const ctx = await resolveContext(user);
    if (!ctx)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    if (ctx.mode === 'demo') {
        return res.json(demoPrefs.get(ctx.email) || DEFAULT_PREFS);
    }
    try {
        const prefs = await getPreferencias(ctx.dbUser.id);
        return res.json(prefs);
    }
    catch {
        return res.status(500).json({ error: 'Error al cargar preferencias' });
    }
});
router.put('/preferencias', async (req, res) => {
    const user = getUser(req);
    const ctx = await resolveContext(user);
    if (!ctx)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    const { idioma, zona_horaria, formato_fecha, tema } = req.body;
    const prefs = {
        idioma: idioma || DEFAULT_PREFS.idioma,
        zona_horaria: zona_horaria || DEFAULT_PREFS.zona_horaria,
        formato_fecha: formato_fecha || DEFAULT_PREFS.formato_fecha,
        tema: tema || DEFAULT_PREFS.tema,
    };
    if (ctx.mode === 'demo') {
        demoPrefs.set(ctx.email, prefs);
        return res.json(prefs);
    }
    try {
        await pool_1.default.query(`INSERT INTO usuario_preferencias (usuario_id, idioma, zona_horaria, formato_fecha, tema, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (usuario_id) DO UPDATE SET
         idioma = EXCLUDED.idioma,
         zona_horaria = EXCLUDED.zona_horaria,
         formato_fecha = EXCLUDED.formato_fecha,
         tema = EXCLUDED.tema,
         updated_at = NOW()`, [ctx.dbUser.id, prefs.idioma, prefs.zona_horaria, prefs.formato_fecha, prefs.tema]);
        return res.json(prefs);
    }
    catch {
        return res.status(500).json({ error: 'Error al guardar preferencias' });
    }
});
router.post('/cambiar-password', async (req, res) => {
    const user = getUser(req);
    const ctx = await resolveContext(user);
    if (!ctx)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password_actual, password_nueva } = req.body;
    if (!password_actual || !password_nueva) {
        return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    if (password_nueva.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    if (ctx.mode === 'demo') {
        const custom = demoPasswords.get(ctx.email);
        const expected = custom || DEMO_PASSWORDS[ctx.email];
        if (expected && expected !== password_actual) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }
        demoPasswords.set(ctx.email, password_nueva);
        return res.json({ message: 'Contraseña actualizada' });
    }
    try {
        const result = await pool_1.default.query('SELECT password_hash FROM usuarios WHERE id = $1', [ctx.dbUser.id]);
        const row = result.rows[0];
        if (!row)
            return res.status(404).json({ error: 'Usuario no encontrado' });
        const valid = await bcryptjs_1.default.compare(password_actual, row.password_hash);
        if (!valid) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }
        const hash = await bcryptjs_1.default.hash(password_nueva, 10);
        await pool_1.default.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [
            hash,
            ctx.dbUser.id,
        ]);
        return res.json({ message: 'Contraseña actualizada' });
    }
    catch {
        return res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});
router.get('/sesiones', async (req, res) => {
    const user = getUser(req);
    const ctx = await resolveContext(user);
    if (!ctx)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    if (ctx.mode === 'demo') {
        return res.json(demoSessions.get(ctx.email) || []);
    }
    try {
        const result = await pool_1.default.query(`SELECT id, user_agent, ip_address, exito, created_at
       FROM sesiones_usuario
       WHERE usuario_id = $1
       ORDER BY created_at DESC
       LIMIT 20`, [ctx.dbUser.id]);
        return res.json(result.rows);
    }
    catch {
        return res.status(500).json({ error: 'Error al cargar historial' });
    }
});
exports.default = router;
