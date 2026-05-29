"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const safeQuery_1 = require("../db/safeQuery");
const auth_1 = require("../middleware/auth");
const notificaciones_1 = require("../utils/notificaciones");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', async (_req, res) => {
    const rows = await (0, safeQuery_1.safeQuery)(`SELECT i.*, v.origen, v.destino
     FROM incidentes i
     LEFT JOIN viajes v ON v.id = i.viaje_id
     ORDER BY i.created_at DESC`);
    return res.json(rows);
});
router.post('/', async (req, res) => {
    const { viaje_id, tipo, descripcion, severidad, reportado_por } = req.body;
    if (!tipo || !descripcion) {
        return res.status(400).json({ error: 'Tipo y descripción son requeridos' });
    }
    try {
        const user = req.user;
        const result = await pool_1.default.query(`INSERT INTO incidentes (viaje_id, tipo, descripcion, severidad, reportado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [viaje_id || null, tipo, descripcion, severidad || 'media', reportado_por || user?.nombre || 'Operador']);
        // Obtener info del viaje si aplica
        let viajeInfo = '';
        if (viaje_id) {
            const v = await pool_1.default.query('SELECT origen, destino FROM viajes WHERE id = $1', [viaje_id]);
            if (v.rows[0])
                viajeInfo = ` en viaje ${v.rows[0].origen} → ${v.rows[0].destino}`;
        }
        const severidadTexto = severidad || 'media';
        const reportadoPor = reportado_por || user?.nombre || 'Operador';
        await (0, notificaciones_1.auditoria)(`[INCIDENTE] Incidente reportado — Severidad: ${severidadTexto.toUpperCase()}`, `Tipo: ${tipo}${viajeInfo}. Reportado por: ${reportadoPor}. Descripción: ${descripcion}`);
        // Si es crítico o alto, notificar también a operadores y autoridades
        if (severidadTexto === 'critica' || severidadTexto === 'alta') {
            await (0, notificaciones_1.notificarAdministradores)(`⚠️ ALERTA: Incidente ${severidadTexto.toUpperCase()}`, `Se reportó un incidente de severidad ${severidadTexto}${viajeInfo}. Tipo: ${tipo}. Requiere atención inmediata.`);
            await (0, notificaciones_1.notificarAutoridades)(`⚠️ ALERTA: Incidente ${severidadTexto.toUpperCase()}`, `Se reportó un incidente de severidad ${severidadTexto}${viajeInfo}. Tipo: ${tipo}. Requiere atención inmediata.`);
        }
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('POST incidente:', err.message);
        return res.status(500).json({ error: 'No se pudo registrar el incidente. Intenta de nuevo.' });
    }
});
router.put('/:id', async (req, res) => {
    const { estado, tipo, descripcion, severidad } = req.body;
    try {
        const anterior = await pool_1.default.query('SELECT estado, tipo FROM incidentes WHERE id = $1', [req.params.id]);
        const result = await pool_1.default.query(`UPDATE incidentes SET
        estado = COALESCE($1, estado),
        tipo = COALESCE($2, tipo),
        descripcion = COALESCE($3, descripcion),
        severidad = COALESCE($4, severidad)
       WHERE id = $5
       RETURNING *`, [estado ?? null, tipo ?? null, descripcion ?? null, severidad ?? null, req.params.id]);
        if (!result.rows[0])
            return res.status(404).json({ error: 'No encontrado' });
        if (anterior.rows[0] && estado && anterior.rows[0].estado !== estado) {
            await (0, notificaciones_1.auditoria)('[INCIDENTE] Estado de incidente actualizado', `El incidente #${req.params.id} (${anterior.rows[0].tipo}) cambió de estado: ${anterior.rows[0].estado} → ${estado}.`);
        }
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error('PUT incidente:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.default = router;
