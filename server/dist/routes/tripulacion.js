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
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT t.*,
      -- Embarcación más reciente asignada
      (SELECT e.nombre
       FROM viaje_tripulacion vt
       INNER JOIN viajes v ON v.id = vt.viaje_id
       INNER JOIN embarcaciones e ON e.id = v.embarcacion_id
       WHERE vt.tripulante_id = t.id
       ORDER BY v.fecha_salida DESC
       LIMIT 1
      ) AS embarcacion_nombre,
      -- Total de viajes asignados
      (SELECT COUNT(*)::int
       FROM viaje_tripulacion vt
       WHERE vt.tripulante_id = t.id
      ) AS viajes_count
     FROM tripulacion t
     ORDER BY t.id`);
    return res.json(rows);
});
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('SELECT * FROM tripulacion WHERE id = $1', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.post('/', async (req, res) => {
    const { nombre, documento, rol, telefono, email, licencias, activo } = req.body;
    try {
        const result = await pool_1.default.query(`INSERT INTO tripulacion
        (nombre, documento, rol, telefono, email, licencias, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            nombre,
            documento,
            rol,
            telefono,
            email,
            licencias,
            activo ?? true,
        ]);
        return res.status(201).json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.put('/:id', async (req, res) => {
    const { nombre, documento, rol, telefono, email, licencias, activo } = req.body;
    try {
        const result = await pool_1.default.query(`UPDATE tripulacion SET
        nombre = $1, documento = $2, rol = $3, telefono = $4,
        email = $5, licencias = $6, activo = $7
       WHERE id = $8
       RETURNING *`, [
            nombre,
            documento,
            rol,
            telefono,
            email,
            licencias,
            activo,
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
        const result = await pool_1.default.query('DELETE FROM tripulacion WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json({ message: 'Eliminado' });
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
