# ✅ Checklist de Funcionalidades - GeoNaval

## 🔐 Sistema de Autenticación y Seguridad

### Login y Bloqueo de Cuentas
- [ ] Login con email y contraseña funciona correctamente
- [ ] Cuentas demo funcionan (test@test.com, admin@geonaval.com)
- [ ] Sistema de 3 intentos fallidos bloquea la cuenta automáticamente
- [ ] Cuentas de administrador NO se bloquean por intentos fallidos
- [ ] Mensaje claro cuando quedan intentos restantes
- [ ] Mensaje de "Cuenta Bloqueada" aparece correctamente
- [ ] Mensaje de "Cuenta Suspendida" aparece correctamente

### Gestión de Usuarios (Admin)
- [ ] Admin puede crear nuevos usuarios
- [ ] Admin puede editar usuarios existentes
- [ ] Admin puede eliminar usuarios (excepto admin)
- [ ] Admin puede SUSPENDER cuentas activas
- [ ] Admin puede ACTIVAR cuentas suspendidas
- [ ] Admin puede DESBLOQUEAR cuentas bloqueadas
- [ ] No se puede modificar cuentas de administrador
- [ ] Estadísticas muestran: Total, Activos, Bloqueados, Inactivos
- [ ] Auditoría registra todas las acciones de usuarios

---

## 🚢 Gestión de Embarcaciones

### CRUD Básico
- [ ] Crear nueva embarcación con todos los campos
- [ ] Editar embarcación existente
- [ ] Eliminar embarcación
- [ ] Ver lista de embarcaciones con filtros
- [ ] Estadísticas: Total, Operativas, En Mantenimiento, Viajes Totales

### Estados y Mantenimiento
- [ ] Cambiar estado de embarcación (modal funciona)
- [ ] Al cambiar a "Mantenimiento" o "Fuera de Servicio" REQUIERE tiempo estimado
- [ ] Tiempo estimado acepta: días, meses, años
- [ ] Campo de motivo opcional funciona
- [ ] Fechas de inicio y fin se calculan automáticamente
- [ ] Solo embarcaciones OPERATIVAS aparecen en selectores de viajes
- [ ] Solo embarcaciones OPERATIVAS permiten asignar tripulación
- [ ] Embarcaciones no operativas muestran alerta clara

### Asignaciones
- [ ] Asignar propietario a embarcación
- [ ] Asignar tripulación a viaje desde embarcación
- [ ] Ver viajes asignados a embarcación
- [ ] Ver tripulación asignada a embarcación

---

## 👥 Gestión de Propietarios

- [ ] Crear propietario (natural o empresa)
- [ ] Editar propietario con todos los campos (dirección, matrícula mercantil)
- [ ] Eliminar propietario
- [ ] Ver lista de propietarios
- [ ] Campos específicos para empresas (NIT, razón social, matrícula)

---

## 🧑‍✈️ Gestión de Tripulación

- [ ] Crear tripulante con rol (capitán, copiloto, etc.)
- [ ] Editar tripulante (incluye email)
- [ ] Eliminar tripulante
- [ ] Ver lista de tripulación activa
- [ ] Marcar tripulante como inactivo
- [ ] Solo tripulantes activos aparecen en selectores

---

## 🎫 Gestión de Pasajeros

- [ ] Crear pasajero
- [ ] Editar pasajero
- [ ] Eliminar pasajero
- [ ] Ver lista de pasajeros
- [ ] Ver viajes asociados a pasajero

---

## 🛳️ Gestión de Viajes (Zarpe)

### CRUD y Validaciones
- [ ] Crear viaje con fecha/hora de salida y llegada
- [ ] Solo embarcaciones OPERATIVAS aparecen en selector
- [ ] Validación de conflictos de horarios
- [ ] Editar viaje existente
- [ ] Cancelar viaje con justificación
- [ ] Eliminar viaje
- [ ] Ver lista de viajes con filtros

### Asignaciones
- [ ] Asignar operador (tripulación) al viaje
- [ ] Asignar múltiples tripulantes
- [ ] Ver tripulación asignada al viaje

### Estados
- [ ] Viaje se crea como "Programado"
- [ ] Cambiar a "En Curso"
- [ ] Cambiar a "Finalizado"
- [ ] Cambiar a "Cancelado" (requiere justificación)

---

## 🎟️ Compra de Pasajes

- [ ] Ver viajes disponibles (solo programados y en curso)
- [ ] Seleccionar asientos disponibles
- [ ] Asientos ocupados aparecen deshabilitados/grises
- [ ] No se pueden seleccionar asientos ya ocupados
- [ ] Registrar pasajero y asignar asiento
- [ ] Ver precio del viaje
- [ ] Método de pago (efectivo por defecto)

---

## 📊 Reportes y Estadísticas

### Filtros
- [ ] Filtro por estado de viaje funciona
- [ ] Filtro por embarcación funciona
- [ ] Filtros se aplican automáticamente
- [ ] Botón "Limpiar Filtros" funciona

### Gráficos
- [ ] Gráfico de viajes por mes muestra datos reales
- [ ] Gráfico de uso de embarcaciones muestra datos reales
- [ ] NO muestra métricas falsas de "horas de operación"

### Exportación
- [ ] Exportar a PDF funciona (viajes, pasajeros, embarcaciones, incidentes)
- [ ] Exportar a Excel/CSV funciona
- [ ] Reportes incluyen datos filtrados correctamente

### Resumen
- [ ] Total de viajes correcto
- [ ] Total de pasajeros correcto
- [ ] Tasa de finalización calculada correctamente
- [ ] Total de incidentes correcto

---

## 🚨 Incidentes

- [ ] Crear incidente asociado a viaje
- [ ] Editar incidente
- [ ] Cambiar severidad (baja, media, alta, crítica)
- [ ] Cambiar estado (abierto, en revisión, cerrado)
- [ ] Ver lista de incidentes
- [ ] Filtrar incidentes por estado

---

## 👮 Panel de Autoridad

### Consultas Oficiales
- [ ] Buscar pasajeros por nombre/documento
- [ ] Buscar tripulación por nombre/documento
- [ ] Buscar embarcaciones por nombre/NIC
- [ ] Buscar viajes por ID/ruta
- [ ] Resultados muestran información completa
- [ ] Historial de consultas se guarda en sesión

### Alertas y Emergencias
- [ ] Muestra incidentes REALES de la base de datos
- [ ] Solo muestra incidentes activos (abierto, en revisión)
- [ ] Botón "Ver Todas" redirige a notificaciones
- [ ] NO muestra alertas estáticas/falsas

### Auditoría de Operaciones
- [ ] Muestra eventos de VIAJES solamente
- [ ] Muestra eventos de EMBARCACIONES
- [ ] Muestra eventos de PASAJEROS
- [ ] Muestra eventos de TRIPULACIÓN
- [ ] Muestra eventos de INCIDENTES
- [ ] NO muestra eventos de USUARIOS (login, password, etc.)
- [ ] Últimas 20 operaciones visibles

### Estadísticas
- [ ] Viajes en curso (dato real)
- [ ] Viajes programados (dato real)
- [ ] Pasajeros en tránsito (dato real)
- [ ] Tabla de viajes en curso actualizada

### Navegación
- [ ] Botón "Ver GPS en Vivo" redirige a monitoreo
- [ ] Botón "Reportes Oficiales" redirige a reportes
- [ ] Botón "Historial de Consultas" muestra/oculta panel

---

## 📍 Monitoreo GPS

- [ ] Ver mapa con ubicaciones de embarcaciones
- [ ] Actualización en tiempo real
- [ ] Ver detalles de embarcación al hacer clic
- [ ] Filtrar por embarcación
- [ ] Ver ruta del viaje

---

## 🔔 Notificaciones (Auditoría)

### Visualización
- [ ] Ver todas las notificaciones
- [ ] Filtrar por categoría (viaje, embarcación, usuario, etc.)
- [ ] Marcar como leída
- [ ] Contador de notificaciones por categoría
- [ ] Estadísticas: Total, Leídas, No Leídas

### Eventos Registrados
- [ ] Nuevos viajes
- [ ] Viajes cancelados/finalizados
- [ ] Cambios de estado de embarcaciones
- [ ] Cuentas bloqueadas
- [ ] Cuentas suspendidas/activadas
- [ ] Cuentas desbloqueadas
- [ ] Nuevos incidentes
- [ ] Cambios en tripulación

### Redirección
- [ ] Botón "Ir a Usuarios" en notificaciones de cuentas bloqueadas
- [ ] Redirección funciona correctamente

---

## 🎛️ Dashboard Principal

### Estadísticas
- [ ] Embarcaciones activas (dato real)
- [ ] Viajes en curso (dato real)
- [ ] Pasajeros registrados (dato real)
- [ ] Viajes hoy (dato real)
- [ ] Próxima llegada (dato real)

### Tabla
- [ ] Últimos 5 viajes recientes
- [ ] Información completa de cada viaje
- [ ] Estados con colores correctos

---

## 👨‍✈️ Dashboard de Operador

- [ ] Ver viajes asignados al operador
- [ ] Ver viaje en curso actual
- [ ] Ver próximos viajes
- [ ] Ver pasajeros del viaje
- [ ] Información de embarcación asignada

---

## ⏰ Zona Horaria y Fechas

- [ ] Todas las fechas en hora de Colombia (UTC-5)
- [ ] WorldTimeAPI integrado correctamente
- [ ] Notificaciones muestran hora correcta
- [ ] Viajes se crean con hora correcta
- [ ] No hay conversiones UTC incorrectas

---

## 🗄️ Base de Datos

### Migraciones
- [ ] Columnas de bloqueo de cuenta existen
- [ ] Columnas de tiempo de mantenimiento existen
- [ ] Todas las tablas tienen las columnas necesarias
- [ ] Secuencias reiniciadas correctamente

### Datos
- [ ] Base de datos limpia (sin datos de prueba)
- [ ] Solo usuarios base existen (admin, operador, autoridad)
- [ ] IDs empiezan desde 1 para nuevos registros

---

## 🎨 Interfaz de Usuario

### General
- [ ] Diseño responsive funciona en móvil
- [ ] Colores y estilos consistentes
- [ ] Iconos se muestran correctamente
- [ ] Animaciones suaves

### SweetAlert2
- [ ] Confirmaciones usan SweetAlert2
- [ ] Mensajes de éxito usan SweetAlert2
- [ ] Mensajes de error usan SweetAlert2
- [ ] Diseño consistente en todas las alertas

### Navegación
- [ ] Menú lateral funciona
- [ ] Cambio entre vistas es fluido
- [ ] Breadcrumbs/títulos correctos
- [ ] Logout funciona correctamente

---

## 🔒 Seguridad

- [ ] JWT tokens funcionan correctamente
- [ ] Sesiones expiran después de 8 horas
- [ ] Rutas protegidas requieren autenticación
- [ ] Roles se validan correctamente
- [ ] Contraseñas hasheadas con bcrypt
- [ ] No se exponen datos sensibles en frontend

---

## 📱 Funcionalidades Específicas por Rol

### Administrador
- [ ] Acceso a todas las vistas
- [ ] Puede gestionar usuarios
- [ ] Puede gestionar todo el sistema
- [ ] No puede ser bloqueado

### Operador
- [ ] Ve solo sus viajes asignados
- [ ] Puede ver pasajeros de sus viajes
- [ ] Dashboard personalizado
- [ ] Puede ser bloqueado/suspendido

### Autoridad
- [ ] Panel de supervisión completo
- [ ] Consultas oficiales funcionan
- [ ] Auditoría filtrada correctamente
- [ ] Acceso a reportes
- [ ] No puede modificar datos

---

## 🐛 Bugs Conocidos Resueltos

- [x] Embarcaciones no operativas aparecían en selectores → RESUELTO
- [x] Horas de operación mostraban datos falsos → ELIMINADO
- [x] Filtros de reportes no funcionaban → SIMPLIFICADO Y ARREGLADO
- [x] Operador aparecía en DEMO_ACCOUNTS → ELIMINADO
- [x] PostgreSQL devolvía booleanos como 't'/'f' → PARSER AGREGADO
- [x] Notificaciones mostraban hora UTC → WORLDTIMEAPI INTEGRADO
- [x] Viajes duplicados se creaban → VALIDACIÓN AGREGADA
- [x] Asientos ocupados se podían seleccionar → DESHABILITADOS
- [x] NotificacionesView pantalla en blanco → NAVEGACIÓN ARREGLADA
- [x] Usuarios no mostraban cuenta_bloqueada → QUERY ACTUALIZADO
- [x] Propietarios sin dirección/matrícula en edición → MAPPER ACTUALIZADO
- [x] Error 500 al suspender usuario → ACTUALIZACIÓN PARCIAL IMPLEMENTADA

---

## 📝 Notas Finales

### Datos de Prueba
- Email: test@test.com / Password: 123456 (Admin)
- Email: admin@geonaval.com / Password: admin123 (Admin)

### Base de Datos
- Host: dpg-d87t07ojs32c73ehkgo0-a.oregon-postgres.render.com
- Database: geonaval_db
- User: geonaval_user

### Deployment
- Frontend + Backend: Render
- Build automático en cada push a master
- Migraciones se aplican automáticamente

---

**Fecha de revisión:** $(date)
**Versión:** 1.0.0
**Estado:** ✅ Listo para producción con datos reales
