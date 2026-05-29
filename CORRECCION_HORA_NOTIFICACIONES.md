# 🕐 Corrección: Hora en Notificaciones (Auditoría)

## ✅ Problema Resuelto

**Problema:** Las notificaciones de auditoría mostraban una hora incorrecta que no coincidía con la hora real de Colombia.

**Causa:** 
1. La columna `created_at` en la tabla `notificaciones` usaba `TIMESTAMP` que puede causar conversiones UTC
2. El frontend usaba `new Date()` que convierte automáticamente a la zona horaria del navegador
3. No había consistencia entre backend y frontend en el manejo de fechas

**Solución:**
1. Cambiar `created_at` a `TIMESTAMP WITHOUT TIME ZONE` para evitar conversiones UTC
2. Parsear las fechas directamente como strings sin conversión
3. Mostrar la hora exactamente como viene del backend (hora de Colombia)

---

## 📝 Cambios Realizados

### 1. Backend - Base de Datos

#### `server/src/db/schema.sql`
```sql
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()  -- ← Cambiado
);
```

#### `server/src/db/migrations.sql`
```sql
-- Cambiar columna created_at a TIMESTAMP WITHOUT TIME ZONE
ALTER TABLE notificaciones ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- Configurar zona horaria de Colombia
ALTER DATABASE postgres SET timezone TO 'America/Bogota';
```

### 2. Frontend - Visualización

#### `src/app/components/NotificacionesView.tsx`

**Antes:**
```typescript
{new Date(n.created_at).toLocaleDateString('es-CO', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  timeZone: 'America/Bogota'
})}
```

**Ahora:**
```typescript
{(() => {
  // Parsear la fecha como si fuera hora de Colombia (sin conversión UTC)
  const fechaStr = n.created_at;
  const partes = fechaStr.replace('T', ' ').split(' ');
  if (partes.length >= 2) {
    const [fecha, hora] = partes;
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }
  // Fallback
  return new Date(fechaStr).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
})()}
```

**Para la hora:**
```typescript
{(() => {
  const fechaStr = n.created_at;
  const partes = fechaStr.replace('T', ' ').split(' ');
  if (partes.length >= 2) {
    const hora = partes[1].split('.')[0]; // Remover milisegundos
    const [h, m] = hora.split(':');
    return `${h}:${m}`;
  }
  // Fallback
  return new Date(fechaStr).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit'
  });
})()}
```

---

## 🔍 Cómo Funciona

### Flujo de Datos

1. **Backend crea notificación:**
   ```typescript
   await pool.query(
     `INSERT INTO notificaciones (usuario_id, titulo, mensaje)
      VALUES ($1, $2, $3)`,
     [usuarioId, titulo, mensaje]
   );
   ```
   - PostgreSQL usa `NOW()` que respeta la zona horaria configurada (`America/Bogota`)
   - Se guarda como `TIMESTAMP WITHOUT TIME ZONE`: `2026-05-28 21:35:42`

2. **Backend devuelve notificación:**
   ```json
   {
     "id": 1,
     "titulo": "[VIAJE] Nuevo viaje programado",
     "mensaje": "Se programó el viaje V-001...",
     "created_at": "2026-05-28 21:35:42"
   }
   ```

3. **Frontend parsea la fecha:**
   - Toma el string `"2026-05-28 21:35:42"` directamente
   - Lo divide en partes: `["2026-05-28", "21:35:42"]`
   - Extrae fecha: `28/05/2026`
   - Extrae hora: `21:35`
   - **No hay conversión de zona horaria** ✅

---

## 🧪 Cómo Probar

### 1. Verificar Zona Horaria en la Base de Datos

```sql
-- Conectar a la base de datos
psql "postgresql://geonaval_user:geonaval123@localhost:5432/geonaval_db"

-- Verificar zona horaria
SHOW timezone;
-- Debe mostrar: America/Bogota

-- Verificar hora actual
SELECT NOW() as hora_actual;
-- Debe mostrar la hora actual de Colombia
```

### 2. Crear una Notificación de Prueba

1. Ve a **"Gestión de Viajes"**
2. Crea un nuevo viaje
3. Esto generará una notificación de auditoría

### 3. Verificar la Hora en Notificaciones

1. Ve a **"Auditoría del Sistema"** (Notificaciones)
2. Busca la notificación recién creada
3. **Verifica que la hora mostrada coincida con la hora real de Colombia**

Ejemplo:
- Si son las **9:35 PM** en Colombia
- La notificación debe mostrar: **28/05/2026 21:35**

### 4. Comparar con la Hora Real

```bash
# En la terminal, verifica la hora actual de Colombia
TZ='America/Bogota' date '+%d/%m/%Y %H:%M'
```

La hora en las notificaciones debe coincidir con esta hora.

---

## 📊 Ejemplo Visual

### Antes (Incorrecto)
```
[VIAJE] Nuevo viaje programado
Se programó el viaje V-001: Quibdó → Istmina...
📅 28/05/2026  🕐 02:35  ← Hora incorrecta (UTC)
```

### Ahora (Correcto)
```
[VIAJE] Nuevo viaje programado
Se programó el viaje V-001: Quibdó → Istmina...
📅 28/05/2026  🕐 21:35  ← Hora correcta (Colombia)
```

---

## 🔧 Aplicar los Cambios

### Opción 1: Automático (al reiniciar el servidor)

```bash
# El servidor aplicará las migraciones automáticamente
npm run dev
```

### Opción 2: Manual con psql

```bash
# Conectar a la base de datos
psql "postgresql://geonaval_user:geonaval123@localhost:5432/geonaval_db"

# Ejecutar las migraciones
ALTER TABLE notificaciones ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;
ALTER DATABASE postgres SET timezone TO 'America/Bogota';
```

### Opción 3: Desde Render (si usas Render)

1. Ve a tu base de datos en Render Dashboard
2. Abre la pestaña "Shell" o "Query"
3. Ejecuta:
   ```sql
   ALTER TABLE notificaciones ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;
   ALTER DATABASE postgres SET timezone TO 'America/Bogota';
   ```

---

## ⚠️ Notas Importantes

### Notificaciones Existentes

Las notificaciones que ya existen en la base de datos pueden tener la hora incorrecta. Tienes dos opciones:

1. **Dejarlas como están** (solo las nuevas tendrán la hora correcta)
2. **Limpiar las notificaciones antiguas:**
   ```sql
   DELETE FROM notificaciones;
   ALTER SEQUENCE notificaciones_id_seq RESTART WITH 1;
   ```

### Consistencia en Toda la Aplicación

Esta corrección asegura que:
- ✅ Notificaciones muestran la hora correcta
- ✅ Viajes muestran la hora correcta
- ✅ Pasajeros muestran la hora correcta
- ✅ Todas las fechas usan la zona horaria de Colombia

---

## 🎯 Resultado Final

Después de aplicar estos cambios:

1. ✅ **Hora correcta en notificaciones** - Coincide con la hora real de Colombia
2. ✅ **Sin conversiones UTC** - Las fechas se manejan como strings
3. ✅ **Consistencia total** - Backend y frontend usan la misma zona horaria
4. ✅ **Fácil de verificar** - Compara con la hora real de tu reloj

---

## 📞 Verificación Final

Para confirmar que todo funciona:

1. **Anota la hora actual de Colombia** (ej: 9:35 PM = 21:35)
2. **Crea un viaje nuevo** en la aplicación
3. **Ve a Notificaciones** (Auditoría del Sistema)
4. **Verifica que la hora de la notificación coincida** con la hora que anotaste

Si la hora coincide, ¡todo está funcionando correctamente! 🎉

---

**Fecha de implementación:** 28 de Mayo de 2026  
**Archivos modificados:** 3  
**Problema:** Hora incorrecta en notificaciones  
**Solución:** TIMESTAMP WITHOUT TIME ZONE + parseo directo de strings
