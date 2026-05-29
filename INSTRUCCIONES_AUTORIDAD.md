# Instrucciones para Activar Notificaciones de Autoridad

## Problema Resuelto
Las notificaciones de auditoría y alertas ahora se envían correctamente a usuarios con rol "autoridad".

## Cambios Realizados

### 1. Backend - Sistema de Notificaciones
- ✅ Modificada función `auditoria()` para enviar notificaciones a usuarios con rol "autoridad"
- ✅ Agregada función `notificarAutoridades()` para alertas críticas
- ✅ Incidentes de severidad alta/crítica ahora notifican a autoridades

### 2. Eventos que se Notifican a Autoridades

#### Viajes:
- Nuevo viaje programado
- Viaje iniciado (EN CURSO)
- Viaje finalizado
- Viaje cancelado
- Cambios en viajes (fecha, ruta, etc.)

#### Embarcaciones:
- Cambios de estado (operativa → mantenimiento → fuera de servicio)
- Asignaciones a viajes

#### Pasajeros:
- Nuevas inscripciones
- Cancelaciones de inscripciones

#### Incidentes:
- Todos los incidentes (auditoría)
- Alertas especiales para incidentes de severidad ALTA o CRÍTICA

## Pasos para Activar en Producción

### 1. Ejecutar Script SQL
Ejecuta el siguiente comando para crear/actualizar el usuario de autoridad:

```bash
psql 'postgresql://geonaval_user:0LmNr4RY58FZAVCOi78JZOSECcX7JC5m@dpg-d87t07ojs32c73ehkgo0-a.oregon-postgres.render.com/geonaval_db' -f crear_usuario_autoridad.sql
```

### 2. Credenciales de Acceso
- **Email**: autoridad@geonaval.com
- **Contraseña**: autoridad123

### 3. Verificar Funcionamiento

1. Inicia sesión con el usuario de autoridad
2. Ve al panel de "Autoridades"
3. Verifica que aparezcan notificaciones en "Auditoría de Operaciones"
4. Crea un incidente de prueba con severidad "alta" o "crítica"
5. Verifica que aparezca en "Alertas y Emergencias"

## Qué Verás en el Panel de Autoridades

### Auditoría de Operaciones
Muestra los últimos 20 eventos del sistema:
- [VIAJE] Eventos de viajes
- [EMBARCACIÓN] Eventos de embarcaciones
- [PASAJERO] Eventos de pasajeros
- [TRIPULACIÓN] Eventos de tripulación
- [INCIDENTE] Eventos de incidentes

### Alertas y Emergencias
Muestra incidentes activos (abiertos o en revisión):
- Incidentes de severidad alta/crítica aparecen destacados
- Se muestran con fondo rojo para mayor visibilidad
- Incluye información del reportante y fecha

## Prueba Rápida

Para probar que funciona:

1. Con un usuario admin, crea un nuevo viaje
2. Inicia sesión como autoridad
3. Deberías ver la notificación "[VIAJE] Nuevo viaje programado" en Auditoría

O bien:

1. Reporta un incidente con severidad "alta"
2. Inicia sesión como autoridad
3. Deberías ver:
   - La notificación en Auditoría
   - El incidente en "Alertas y Emergencias"
   - Una alerta especial "⚠️ ALERTA: Incidente ALTA"

## Notas Importantes

- Las notificaciones se crean en tiempo real cuando ocurren los eventos
- Solo se muestran las últimas 20 notificaciones en auditoría
- Los incidentes resueltos o cerrados no aparecen en "Alertas y Emergencias"
- Todas las consultas realizadas por autoridades se registran en el historial

## Solución de Problemas

Si no ves notificaciones:
1. Verifica que el usuario tenga rol "autoridad" (no "administrador")
2. Ejecuta el script SQL para asegurar que el usuario existe
3. Cierra sesión y vuelve a iniciar
4. Verifica que haya eventos recientes en el sistema (crea un viaje de prueba)
