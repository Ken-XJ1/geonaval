"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pool_1 = __importDefault(require("../db/pool"));
const router = (0, express_1.Router)();
/** Cuentas de prueba — funcionan aunque PostgreSQL no esté disponible */
const DEMO_ACCOUNTS = [
    {
        email: 'test@test.com',
        password: '123456',
        id: 0,
        nombre: 'Usuario Prueba',
        rol: 'administrador',
    },
    {
        email: 'admin@geonaval.com',
        password: 'admin123',
        id: 1,
        nombre: 'Administrador GeoNaval',
        rol: 'administrador',
    },
    {
        email: 'operador@geonaval.com',
        password: 'operador123',
        id: 2,
        nombre: 'Operador Demo',
        rol: 'operador',
    },
    {
        email: 'cliente@geonaval.com',
        password: 'cliente123',
        id: 3,
        nombre: 'Cliente Demo',
        rol: 'cliente',
    },
    {
        email: 'autoridad@geonaval.com',
        password: 'autoridad123',
        id: 4,
        nombre: 'Autoridad Demo',
        rol: 'autoridad',
    },
];
function signToken(user) {
    const token = jsonwebtoken_1.default.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    return { token, rol: user.rol, nombre: user.nombre };
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
    const demo = findDemoAccount(email, password);
    if (demo) {
        return res.json(signToken(demo));
    }
    try {
        const result = await pool_1.default.query('SELECT * FROM usuarios WHERE LOWER(email) = $1 AND activo = true', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({
                error: 'Credenciales inválidas. Prueba: test@test.com / 123456',
            });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({
                error: 'Credenciales inválidas. Prueba: test@test.com / 123456',
            });
        }
        return res.json(signToken({
            id: user.id,
            rol: user.rol,
            nombre: user.nombre,
        }));
    }
    catch {
        return res.status(503).json({
            error: 'Base de datos no disponible. Usa: test@test.com / 123456',
        });
    }
});
exports.default = router;
