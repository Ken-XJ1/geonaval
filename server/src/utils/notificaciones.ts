import pool from '../db/pool';

/**
 * Formatea una fecha para mostrar en notificaciones
 */
export function formatearFechaColombia(fecha: string | Date): string {
  if (!fecha) return '—';
  const s = String(fecha).trim();
  const datePart = s.split('T')[0].split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
}

/**
 * Envía una notificación a un usuario específico
 */
export async function enviarNotificacion(
  usuarioId: number,
  titulo: string,
  mensaje: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje)
       VALUES ($1, $2, $3)`,
      [usuarioId, titulo, mensaje]
    );
  } catch (err) {
    console.error('Error enviando notificación:', err);
  }
}

/**
 * Envía una notificación a todos los usuarios con un rol específico
 */
export async function enviarNotificacionPorRol(
  rol: string,
  titulo: string,
  mensaje: string
): Promise<void> {
  try {
    const usuarios = await pool.query(
      'SELECT id FROM usuarios WHERE rol = $1 AND activo = true',
      [rol]
    );
    
    for (const usuario of usuarios.rows) {
      await enviarNotificacion(usuario.id, titulo, mensaje);
    }
  } catch (err) {
    console.error('Error enviando notificaciones por rol:', err);
  }
}

/**
 * Envía una notificación a todos los administradores
 */
export async function notificarAdministradores(
  titulo: string,
  mensaje: string
): Promise<void> {
  await enviarNotificacionPorRol('administrador', titulo, mensaje);
}

/**
 * Envía una notificación a todos los clientes
 */
export async function notificarClientes(
  titulo: string,
  mensaje: string
): Promise<void> {
  await enviarNotificacionPorRol('cliente', titulo, mensaje);
}

/**
 * Envía una notificación a todos los pasajeros inscritos en un viaje
 */
export async function notificarPasajerosViaje(
  viajeId: number,
  titulo: string,
  mensaje: string
): Promise<void> {
  try {
    const pasajeros = await pool.query(
      `SELECT DISTINCT vp.usuario_id
       FROM viaje_pasajeros vp
       INNER JOIN usuarios u ON u.id = vp.usuario_id
       WHERE vp.viaje_id = $1 AND u.activo = true AND vp.usuario_id IS NOT NULL`,
      [viajeId]
    );
    
    for (const pasajero of pasajeros.rows) {
      await enviarNotificacion(pasajero.usuario_id, titulo, mensaje);
    }
  } catch (err) {
    console.error('Error notificando pasajeros del viaje:', err);
  }
}
