-- Migración para agregar campos de tiempo de mantenimiento
-- Ejecutar en la base de datos de Render

-- Agregar columnas para tiempo de mantenimiento en embarcaciones
ALTER TABLE embarcaciones ADD COLUMN IF NOT EXISTS tiempo_mantenimiento_estimado VARCHAR(100);
ALTER TABLE embarcaciones ADD COLUMN IF NOT EXISTS fecha_inicio_mantenimiento TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE embarcaciones ADD COLUMN IF NOT EXISTS fecha_fin_mantenimiento_estimada TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE embarcaciones ADD COLUMN IF NOT EXISTS motivo_mantenimiento TEXT;

-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'embarcaciones' 
AND column_name IN ('tiempo_mantenimiento_estimado', 'fecha_inicio_mantenimiento', 'fecha_fin_mantenimiento_estimada', 'motivo_mantenimiento');
