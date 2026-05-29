-- Limpieza de datos de producción
-- Mantiene solo los usuarios, elimina todo lo demás

-- Desactivar triggers temporalmente para evitar problemas
SET session_replication_role = 'replica';

-- Limpiar en orden por dependencias (de más dependiente a menos)
DELETE FROM ubicaciones_gps;
DELETE FROM incidentes;
DELETE FROM notificaciones;
DELETE FROM viaje_pasajeros;
DELETE FROM viaje_tripulacion;
DELETE FROM viajes;
DELETE FROM pasajeros;
DELETE FROM tripulacion;
DELETE FROM embarcaciones;
DELETE FROM propietarios;
DELETE FROM sesiones_usuario;
DELETE FROM usuario_preferencias;

-- Reactivar triggers
SET session_replication_role = 'origin';

-- Reiniciar secuencias para que los IDs empiecen desde 1
ALTER SEQUENCE IF EXISTS propietarios_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS embarcaciones_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tripulacion_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS pasajeros_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS viajes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS incidentes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notificaciones_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ubicaciones_gps_id_seq RESTART WITH 1;

-- Verificar que solo quedan usuarios
SELECT 'Usuarios restantes:' as info, COUNT(*) as total FROM usuarios;
SELECT 'Propietarios:' as info, COUNT(*) as total FROM propietarios;
SELECT 'Embarcaciones:' as info, COUNT(*) as total FROM embarcaciones;
SELECT 'Tripulación:' as info, COUNT(*) as total FROM tripulacion;
SELECT 'Pasajeros:' as info, COUNT(*) as total FROM pasajeros;
SELECT 'Viajes:' as info, COUNT(*) as total FROM viajes;
SELECT 'Incidentes:' as info, COUNT(*) as total FROM incidentes;
SELECT 'Notificaciones:' as info, COUNT(*) as total FROM notificaciones;

-- Mostrar usuarios que quedaron
SELECT id, nombre, email, rol, activo FROM usuarios ORDER BY id;
