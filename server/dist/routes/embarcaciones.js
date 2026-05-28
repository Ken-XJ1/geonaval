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
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT e.*,
      pr.nombre AS propietario_nombre,
      (SELECT COUNT(*)::int FROM viajes v WHERE v.embarcacion_id = e.id) AS viajes_count
     FROM embarcaciones e
     LEFT JOIN propietarios pr ON pr.id = e.propietario_id
     ORDER BY e.id`);
    return res.json(rows);
});
router.get('/:id/detalles', async (req, res) => {
    const id = req.params.id;
    try {
        const emb = await pool_1.default.query(`SELECT e.*, pr.nombre AS propietario_nombre
       FROM embarcaciones e
       LEFT JOIN propietarios pr ON pr.id = e.propietario_id
       WHERE e.id = $1`, [id]);
        if (!emb.rows[0]) {
            return res.status(404).json({ error: 'No encontrado' });
        }
        const viajes = await (0, safeQuery_1.safeQuery)(`SELECT v.id, v.origen, v.destino, v.fecha_salida, v.estado,
        COALESCE(
          (SELECT string_agg(t.nombre || ' (' || t.rol || ')', ', ')
           FROM viaje_tripulacion vt
           INNER JOIN tripulacion t ON t.id = vt.tripulante_id
           WHERE vt.viaje_id = v.id),
          ''
        ) AS operadores
       FROM viajes v
       WHERE v.embarcacion_id = $1
       ORDER BY v.fecha_salida DESC`, [id]);
        const tripulacion = await (0, safeQuery_1.safeQuery)(`SELECT DISTINCT t.id, t.nombre, t.rol
       FROM viaje_tripulacion vt
       INNER JOIN tripulacion t ON t.id = vt.tripulante_id
       INNER JOIN viajes v ON v.id = vt.viaje_id
       WHERE v.embarcacion_id = $1
       ORDER BY t.nombre`, [id]);
        return res.json({
            embarcacion: emb.rows[0],
            viajes,
            tripulacion,
        });
    }
    catch (err) {
        console.error('Detalles embarcación:', err.message);
        return res.status(500).json({ error: 'Error al cargar detalles' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('SELECT * FROM embarcaciones WHERE id = $1', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
router.post('/', async (req, res) => {
    const { nombre, tipo, capacidad_pasajeros, motor, potencia, dimensiones, estado, propietario_id, } = req.body;
    if (!nombre || !capacidad_pasajeros) {
        return res.status(400).json({ error: 'Nombre y capacidad son requeridos' });
    }
    try {
        // Generar NIC único automáticamente para evitar conflictos
        const nicBase = `EMB-${Date.now()}`;
        const nicFinal = `${nicBase}-${Math.floor(Math.random() * 1000)}`;
        const result = await pool_1.default.query(`INSERT INTO embarcaciones
        (nic, nombre, tipo, capacidad_pasajeros, motor, potencia, dimensiones, estado, propietario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [
            nicFinal,
            nombre,
            tipo ?? 'lancha',
            capacidad_pasajeros,
            motor ?? null,
            potencia ?? null,
            dimensiones ?? null,
            estado ?? 'operativa',
            propietario_id ?? null,
        ]);
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('POST embarcacion:', err.message);
        const msg = err.message || '';
        if (msg.includes('unique') || msg.includes('duplicate')) {
            return res.status(400).json({ error: 'Ya existe una embarcación con ese identificador. Intenta de nuevo.' });
        }
        if (msg.includes('propietarios')) {
            return res.status(400).json({ error: 'El propietario seleccionado no existe' });
        }
        return res.status(500).json({ error: `Error al crear embarcación: ${msg}` });
    }
});
router.put('/:id', async (req, res) => {
    const { nic, nombre, tipo, capacidad_pasajeros, motor, potencia, dimensiones, estado, propietario_id, } = req.body;
    try {
        const result = await pool_1.default.query(`UPDATE embarcaciones SET
        nic = COALESCE($1, nic),
        nombre = COALESCE($2, nombre),
        tipo = COALESCE($3, tipo),
        capacidad_pasajeros = COALESCE($4, capacidad_pasajeros),
        motor = $5,
        potencia = $6,
        dimensiones = $7,
        estado = COALESCE($8, estado),
        propietario_id = $9
       WHERE id = $10
       RETURNING *`, [
            nic ?? null,
            nombre ?? null,
            tipo ?? null,
            capacidad_pasajeros ?? null,
            motor ?? null,
            potencia ?? null,
            dimensiones ?? null,
            estado ?? null,
            propietario_id ?? null,
            req.params.id,
        ]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error('PUT embarcacion:', err.message);
        return res.status(500).json({ error: `Error al actualizar: ${err.message}` });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool_1.default.query('DELETE FROM embarcaciones WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        return res.json({ message: 'Eliminado' });
    }
    catch {
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
