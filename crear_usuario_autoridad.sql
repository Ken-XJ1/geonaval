-- Script para crear/actualizar usuario de autoridad
-- Este usuario recibirá todas las notificaciones de auditoría y alertas

-- Crear o actualizar usuario de autoridad
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
  ('Autoridad Naval', 'autoridad@geonaval.com',
   '$2b$10$mvkC3z6af14i6bC4lVgExu4g2jKSW6uClQofX2MlfrDsd1GnqqRpa', 'autoridad', true)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  rol = 'autoridad',
  activo = true,
  nombre = 'Autoridad Naval';

-- Verificar que se creó correctamente
SELECT id, nombre, email, rol, activo FROM usuarios WHERE rol = 'autoridad';
