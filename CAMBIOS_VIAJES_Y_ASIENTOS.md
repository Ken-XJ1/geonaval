# 🔧 Correcciones: Duplicación de Viajes y Asientos Ocupados

## ✅ Problemas Resueltos

### 1. Viajes Duplicados al Crear
**Problema:** Al crear un viaje, se duplicaba en la base de datos.

**Causa:** El formulario se enviaba dos veces (doble clic o doble submit).

**Solución:**
- Agregado estado `submitting` para prevenir envíos duplicados
- Botón "Programar" se deshabilita mientras se procesa
- Muestra spinner y texto "Creando..." durante el proceso
- Logs en consola para debugging

**Archivos modificados:**
- `src/app/components/ViajesView.tsx`

### 2. Asientos Ocupados No Visibles
**Problema:** Los asientos ocupados no se distinguían claramente y se podían seleccionar.

**Causa:** El estilo visual no era suficientemente claro.

**Solución:**
- Asientos ocupados ahora tienen:
  - Fondo rojo más visible (`bg-red-200`)
  - Texto tachado (`line-through`)
  - Opacidad reducida (`opacity-60`)
  - Cursor `not-allowed`
  - Tooltip "Asiento ocupado"
- Asientos disponibles tienen:
  - Borde más grueso (`border-2`)
  - Efecto hover con escala (`hover:scale-105`)
  - Tooltip "Clic para seleccionar"
- Asientos seleccionados tienen:
  - Sombra más pronunciada (`shadow-lg`)
  - Escala aumentada (`scale-105`)
  - Tooltip "Clic para deseleccionar"
- Leyenda mejorada con iconos más grandes
- Contador de asientos ocupados en rojo

**Archivos modificados:**
- `src/app/components/ComprasView.tsx`

---

## 📝 Detalles Técnicos

### Prevención de Duplicación

```typescript
// Estado para controlar el envío
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Prevenir envíos duplicados
  if (submitting) {
    console.log('⚠️ Ya se está procesando un viaje, ignorando envío duplicado');
    return;
  }
  
  try {
    setSubmitting(true);
    setError(null);
    
    console.log('📤 Creando viaje...');
    await api.createViaje({ /* ... */ });
    console.log('✅ Viaje creado exitosamente');
    
    // ... resto del código
  } catch (e) {
    console.error('❌ Error al crear viaje:', e);
    setError(e instanceof Error ? e.message : 'Error al guardar');
  } finally {
    setSubmitting(false);
  }
};
```

### Botón con Estado de Carga

```typescript
<button
  type="submit"
  disabled={conflictoDetectado || submitting}
  className={/* ... */}
>
  {submitting ? (
    <>
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      Creando...
    </>
  ) : (
    'Programar'
  )}
</button>
```

### Asientos Ocupados Mejorados

```typescript
<button
  key={asientoId}
  type="button"
  disabled={ocupado}
  onClick={() => !ocupado && setAsiento(seleccionado ? '' : asientoId)}
  className={`w-full py-2 px-1 rounded-lg text-xs font-medium transition-all ${
    ocupado
      ? 'bg-red-200 text-red-600 cursor-not-allowed opacity-60 line-through'
      : seleccionado
      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 shadow-lg scale-105'
      : 'bg-white border-2 border-border hover:border-primary hover:bg-primary/5 hover:scale-105'
  }`}
  title={ocupado ? 'Asiento ocupado' : seleccionado ? 'Clic para deseleccionar' : 'Clic para seleccionar'}
>
  {asientoId}
</button>
```

### Contador de Asientos Ocupados

```typescript
{asientosOcupados.length > 0 && (
  <p className="text-center mt-2 text-xs text-red-600 bg-red-50 py-1.5 rounded">
    {asientosOcupados.length} asiento{asientosOcupados.length > 1 ? 's' : ''} ocupado{asientosOcupados.length > 1 ? 's' : ''}
  </p>
)}
```

---

## 🧪 Cómo Probar

### 1. Probar Prevención de Duplicación

1. Ve a "Gestión de Viajes"
2. Haz clic en "Programar Nuevo Viaje"
3. Completa el formulario
4. Haz clic en "Programar"
5. **Resultado esperado:**
   - El botón muestra "Creando..." con spinner
   - El botón se deshabilita
   - Solo se crea UN viaje
   - No se puede hacer doble clic

### 2. Probar Asientos Ocupados

1. Ve a "Compras y Tickets"
2. Haz clic en "Nueva Compra"
3. Completa Paso 1 (datos personales)
4. En Paso 2, selecciona un viaje
5. **Resultado esperado:**
   - Asientos disponibles: fondo blanco, borde gris
   - Asientos ocupados: fondo rojo, texto tachado, no se pueden seleccionar
   - Al pasar el mouse sobre un asiento ocupado: cursor "not-allowed"
   - Al seleccionar un asiento disponible: fondo azul, sombra, escala aumentada
   - Contador muestra "X asientos ocupados" si hay asientos ocupados

### 3. Probar Flujo Completo

1. Crea un viaje nuevo
2. Compra un pasaje para ese viaje seleccionando el asiento A-01
3. Intenta comprar otro pasaje para el mismo viaje
4. **Resultado esperado:**
   - El asiento A-01 aparece ocupado (rojo, tachado)
   - No se puede seleccionar el asiento A-01
   - Los demás asientos están disponibles

---

## 🎨 Mejoras Visuales

### Antes
- Asientos ocupados: fondo rojo claro, difícil de distinguir
- Sin indicador de carga al crear viaje
- Sin contador de asientos ocupados

### Ahora
- Asientos ocupados: fondo rojo, texto tachado, opacidad reducida, muy visible
- Botón con spinner y texto "Creando..." mientras se procesa
- Contador de asientos ocupados en rojo
- Tooltips informativos en cada asiento
- Efectos hover mejorados con escala

---

## 📊 Logs de Debugging

El sistema ahora incluye logs en consola para facilitar el debugging:

```
📤 Creando viaje... { fecha_salida: '2026-05-29 10:00:00', origen: 'Quibdó', destino: 'Istmina' }
✅ Viaje creado exitosamente
```

```
⚠️ Ya se está procesando un viaje, ignorando envío duplicado
```

```
🔍 Cargando asientos ocupados para viaje: 1
🔍 Asientos ocupados: ['A-01', 'B-03', 'C-02']
```

---

## ✅ Resultado Final

- ✅ **No más viajes duplicados** - El botón se deshabilita durante el proceso
- ✅ **Asientos ocupados claramente visibles** - Fondo rojo, texto tachado, no seleccionables
- ✅ **Mejor experiencia de usuario** - Feedback visual claro en todo momento
- ✅ **Debugging mejorado** - Logs en consola para facilitar el desarrollo

---

**Fecha de implementación:** 28 de Mayo de 2026  
**Archivos modificados:** 2  
**Líneas modificadas:** ~50
