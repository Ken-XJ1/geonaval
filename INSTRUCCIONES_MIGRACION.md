# 🔧 Instrucciones para Aplicar la Migración de Zona Horaria

## Problema Resuelto
Las fechas y horas ahora coincidirán con la hora real de Colombia (America/Bogota). Se ha implementado:

1. ✅ **Configuración de zona horaria** en PostgreSQL
2. ✅ **Validación de fechas pasadas** en backend y frontend
3. ✅ **Limpieza de datos** para empezar con fechas correctas
4. ✅ **Prevención de viajes con fechas pasadas**

## Cambios Realizados

### Backend
- `server/src/db/pool.ts`: Configuración automática de zona horaria en cada conexión
- `server/src/routes/viajes.ts`: Validación que no permite crear viajes con fechas pasadas usando hora de Colombia
- `server/src/db/migrations.sql`: Script de limpieza de datos y configuración de zona horaria

### Frontend
- `src/app/components/ViajesView.tsx`: Input de fecha con mínimo = fecha actual de Colombia
- Función `getFechaActualColombia()` que obtiene la fecha correcta en zona horaria de Colombia

## Pasos para Aplicar la Migración

### Opción 1: Aplicar desde la aplicación (Recomendado)
1. Reinicia el servidor backend:
   ```bash
   cd ~/Escritorio/geonaval/Geonaval2026-main
   npm run dev
   ```

2. El servidor automáticamente:
   - Configurará la zona horaria en cada conexión
   - Aplicará las migraciones pendientes al iniciar

### Opción 2: Aplicar manualmente con psql
Si prefieres aplicar la migración manualmente:

```bash
# Conectar a la base de datos
psql -h <host> -U <usuario> -d <base_de_datos>

# Ejecutar el script de migración
\i aplicar_migraciones.sql
```

O si tienes la URL de conexión:
```bash
psql "postgresql://usuario:password@host:puerto/database?sslmode=require" -f aplicar_migraciones.sql
```

### Opción 3: Desde Render Dashboard (si usas Render)
1. Ve a tu base de datos en Render Dashboard
2. Abre la pestaña "Shell" o "Query"
3. Copia y pega el contenido de `aplicar_migraciones.sql`
4. Ejecuta el script

## Verificación

Después de aplicar la migración, verifica que todo funcione:

1. **Zona horaria configurada:**
   ```sql
   SHOW timezone;
   -- Debe mostrar: America/Bogota
   
   SELECT NOW() as hora_actual;
   -- Debe mostrar la hora actual de Colombia
   ```

2. **Datos limpios:**
   ```sql
   SELECT COUNT(*) FROM viajes;
   -- Debe mostrar: 0
   
   SELECT COUNT(*) FROM pasajeros;
   -- Debe mostrar: 0
   ```

3. **Usuarios y flota intactos:**
   ```sql
   SELECT COUNT(*) FROM usuarios;
   SELECT COUNT(*) FROM embarcaciones;
   SELECT COUNT(*) FROM propietarios;
   SELECT COUNT(*) FROM tripulacion;
   -- Deben mostrar los registros existentes
   ```

## Pruebas en la Aplicación

1. **Crear un viaje nuevo:**
   - Ve a "Gestión de Viajes"
   - Haz clic en "Programar Nuevo Viaje"
   - Intenta seleccionar una fecha pasada → Debe estar deshabilitada
   - Selecciona la fecha de hoy o futura → Debe funcionar

2. **Verificar horas:**
   - Las horas mostradas deben coincidir con la hora real de Colombia
   - Ejemplo: Si son las 9:35 PM en Colombia, la aplicación debe mostrar 21:35

3. **Comprar un pasaje:**
   - Ve a "Compras y Tickets"
   - Los viajes disponibles deben mostrar fechas y horas correctas
   - Al descargar el ticket, la fecha y hora deben ser correctas

## Notas Importantes

⚠️ **Esta migración elimina todos los datos operativos:**
- Viajes
- Pasajeros
- Incidentes
- Notificaciones
- Ubicaciones GPS

✅ **Se mantienen intactos:**
- Usuarios (admin, operador, autoridad)
- Embarcaciones
- Propietarios
- Tripulación

## Solución de Problemas

### Las fechas siguen desordenadas
1. Verifica que la zona horaria esté configurada:
   ```sql
   SHOW timezone;
   ```
2. Reinicia el servidor backend
3. Limpia la caché del navegador (Ctrl + Shift + R)

### No puedo crear viajes
1. Verifica que la fecha seleccionada no sea en el pasado
2. Revisa la consola del navegador (F12) para ver errores
3. Verifica que el servidor esté corriendo

### Error de conexión a la base de datos
1. Verifica que el archivo `.env` tenga la URL correcta
2. Verifica que la base de datos esté accesible
3. Revisa los logs del servidor

## Contacto

Si tienes problemas aplicando la migración, revisa los logs del servidor y la consola del navegador para más detalles.
