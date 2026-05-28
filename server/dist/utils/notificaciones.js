"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatearFechaColombia = formatearFechaColombia;
exports.enviarNotificacion = enviarNotificacion;
exports.enviarNotificacionPorRol = enviarNotificacionPorRol;
exports.notificarAdministradores = notificarAdministradores;
exports.notificarClientes = notificarClientes;
exports.notificarPasajerosViaje = notificarPasajerosViaje;
const pool_1 = __importDefault(require("../db/pool"));
/**
 * Formatea una fecha para mostrar en notificaciones
 */
function formatearFechaColombia(fecha) {
    if (!fecha)
        return '—';
    const s = String(fecha).trim();
    const datePart = s.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3)
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return s;
}
/**
 * Envía una notificación a un usuario específico
 */
async function enviarNotificacion(usuarioId, titulo, mensaje) {
    try {
        await pool_1.default.query(`INSERT INTO notificaciones (usuario_id, titulo, mensaje)
       VALUES ($1, $2, $3)`, [usuarioId, titulo, mensaje]);
    }
    catch (err) {
        console.error('Error enviando notificación:', err);
    }
}
/**
 * Envía una notificación a todos los usuarios con un rol específico
 */
async function enviarNotificacionPorRol(rol, titulo, mensaje) {
    try {
        const usuarios = await pool_1.default.query('SELECT id FROM usuarios WHERE rol = $1 AND activo = true', [rol]);
        for (const usuario of usuarios.rows) {
            await enviarNotificacion(usuario.id, titulo, mensaje);
        }
    }
    catch (err) {
        console.error('Error enviando notificaciones por rol:', err);
    }
}
/**
 * Envía una notificación a todos los administradores
 */
async function notificarAdministradores(titulo, mensaje) {
    await enviarNotificacionPorRol('administrador', titulo, mensaje);
}
/**
 * Envía una notificación a todos los clientes
 */
async function notificarClientes(titulo, mensaje) {
    await enviarNotificacionPorRol('cliente', titulo, mensaje);
}
/**
 * Envía una notificación a todos los pasajeros inscritos en un viaje
 */
async function notificarPasajerosViaje(viajeId, titulo, mensaje) {
    try {
        const pasajeros = await pool_1.default.query(`SELECT DISTINCT vp.usuario_id
       FROM viaje_pasajeros vp
       INNER JOIN usuarios u ON u.id = vp.usuario_id
       WHERE vp.viaje_id = $1 AND u.activo = true AND vp.usuario_id IS NOT NULL`, [viajeId]);
        for (const pasajero of pasajeros.rows) {
            await enviarNotificacion(pasajero.usuario_id, titulo, mensaje);
        }
    }
    catch (err) {
        console.error('Error notificando pasajeros del viaje:', err);
    }
}
