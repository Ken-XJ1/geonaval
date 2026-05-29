-- ============================================================
-- SCRIPT DE MIGRACIÓN: Configurar zona horaria y limpiar datos
-- Ejecutar este script en la base de datos PostgreSQL
-- ============================================================

-- 1. Configurar zona horaria de Colombia en la base de datos
ALTER DATABASE postgres SET timezone TO 'America/Bogota';

-- Reconectar para que tome efecto (o ejecutar en nueva sesión)
SET timezone = 'America/Bogota';

-- 2. Verificar zona horaria actual
SHOW timezone;
SELECT NOW() as hora_actual_colombia;

-- 3. Limpiar datos operativos (mantiene usuarios, embarcaciones, propietarios, tripulación)
DELETE FROM ubicaciones_gps;
DELETE FROM viaje_pasajeros;
DELETE FROM viaje_tripulacion;
DELETE FROM incidentes;
DELETE FROM notificaciones;
DELETE FROM pasajeros;
DELETE FROM viajes;

-- 4. Resetear secuencias para empezar desde 1
ALTER SEQUENCE viajes_id_seq RESTART WITH 1;
ALTER SEQUENCE pasajeros_id_seq RESTART WITH 1;
ALTER SEQUENCE incidentes_id_seq RESTART WITH 1;
ALTER SEQUENCE notificaciones_id_seq RESTART WITH 1;
ALTER SEQUENCE ubicaciones_gps_id_seq RESTART WITH 1;

-- 5. Verificar que las tablas estén vacías
SELECT 'viajes' as tabla, COUNT(*) as registros FROM viajes
UNION ALL
SELECT 'pasajeros', COUNT(*) FROM pasajeros
UNION ALL
SELECT 'incidentes', COUNT(*) FROM incidentes
UNION ALL
SELECT 'notificaciones', COUNT(*) FROM notificaciones
UNION ALL
SELECT 'ubicaciones_gps', COUNT(*) FROM ubicaciones_gps;

-- 6. Mostrar datos que se mantienen
SELECT 'usuarios' as tabla, COUNT(*) as registros FROM usuarios
UNION ALL
SELECT 'embarcaciones', COUNT(*) FROM embarcaciones
UNION ALL
SELECT 'propietarios', COUNT(*) FROM propietarios
UNION ALL
SELECT 'tripulacion', COUNT(*) FROM tripulacion;

SELECT '✅ Migración completada. Base de datos limpia y configurada con zona horaria America/Bogota' as resultado;
