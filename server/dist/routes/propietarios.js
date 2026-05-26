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
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT p.*,
      COUNT(e.id)::int AS embarcaciones_count
     FROM propietarios p
     LEFT JOIN embarcaciones e ON e.propietario_id = p.id
     GROUP BY p.id
     ORDER BY p.id`);
    return res.json(rows);
});
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('SELECT * FROM propietarios WHERE id = $1', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.post('/', async (req, res) => {
    const { tipo, nombre, identificacion, telefono, direccion, nit, razon_social, matricula_mercantil, fecha_registro, estado, } = req.body;
    try {
        const result = await pool_1.default.query(`INSERT INTO propietarios
        (tipo, nombre, identificacion, telefono, direccion, nit, razon_social, matricula_mercantil, fecha_registro, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [
            tipo,
            nombre,
            identificacion,
            telefono,
            direccion,
            nit,
            razon_social,
            matricula_mercantil,
            fecha_registro,
            estado ?? 'activo',
        ]);
        return res.status(201).json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.put('/:id', async (req, res) => {
    const { tipo, nombre, identificacion, telefono, direccion, nit, razon_social, matricula_mercantil, fecha_registro, estado, } = req.body;
    try {
        const result = await pool_1.default.query(`UPDATE propietarios SET
        tipo = $1, nombre = $2, identificacion = $3, telefono = $4, direccion = $5,
        nit = $6, razon_social = $7, matricula_mercantil = $8, fecha_registro = $9, estado = $10
       WHERE id = $11
       RETURNING *`, [
            tipo,
            nombre,
            identificacion,
            telefono,
            direccion,
            nit,
            razon_social,
            matricula_mercantil,
            fecha_registro,
            estado,
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
        const result = await pool_1.default.query('DELETE FROM propietarios WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json({ message: 'Eliminado' });
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
