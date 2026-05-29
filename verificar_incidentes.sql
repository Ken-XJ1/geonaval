-- Script para verificar incidentes y notificaciones en la base de datos

-- Ver todos los incidentes
SELECT 
  id,
  tipo,
  descripcion,
  severidad,
  estado,
  reportado_por,
  viaje_id,
  created_at
FROM incidentes
ORDER BY created_at DESC
LIMIT 20;

-- Ver incidentes activos (abiertos o en revisión)
SELECT 
  COUNT(*) as total_activos,
  severidad,
  estado
FROM incidentes
WHERE estado IN ('abierto', 'en_revision')
GROUP BY severidad, estado;

-- Ver todas las notificaciones del usuario autoridad
SELECT 
  n.id,
  n.titulo,
  n.mensaje,
  n.leida,
  n.created_at,
  u.nombre as usuario,
  u.rol
FROM notificaciones n
JOIN usuarios u ON u.id = n.usuario_id
WHERE u.rol = 'autoridad'
ORDER BY n.created_at DESC
LIMIT 30;

-- Ver usuarios con rol autoridad
SELECT id, nombre, email, rol, activo FROM usuarios WHERE rol = 'autoridad';
