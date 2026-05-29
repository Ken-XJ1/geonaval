#!/bin/bash

echo "=========================================="
echo "🔍 VERIFICACIÓN DEL SISTEMA GEONAVAL"
echo "=========================================="
echo ""

DB_URL='postgresql://geonaval_user:0LmNr4RY58FZAVCOi78JZOSECcX7JC5m@dpg-d87t07ojs32c73ehkgo0-a.oregon-postgres.render.com/geonaval_db'

echo "1️⃣  Verificando conexión a base de datos..."
psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Conexión exitosa"
else
    echo "   ❌ Error de conexión"
    exit 1
fi

echo ""
echo "2️⃣  Verificando tablas principales..."
TABLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "   📊 Tablas encontradas: $TABLES"

echo ""
echo "3️⃣  Verificando usuarios..."
psql "$DB_URL" -c "SELECT id, nombre, email, rol, activo, cuenta_bloqueada FROM usuarios ORDER BY id;" 2>/dev/null

echo ""
echo "4️⃣  Verificando columnas de mantenimiento en embarcaciones..."
COLS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'embarcaciones' AND column_name IN ('tiempo_mantenimiento_estimado', 'fecha_inicio_mantenimiento', 'fecha_fin_mantenimiento_estimada', 'motivo_mantenimiento');")
if [ "$COLS" -eq 4 ]; then
    echo "   ✅ Todas las columnas de mantenimiento existen"
else
    echo "   ⚠️  Faltan columnas de mantenimiento ($COLS/4)"
fi

echo ""
echo "5️⃣  Conteo de registros..."
echo "   Propietarios:    $(psql "$DB_URL" -t -c 'SELECT COUNT(*) FROM propietarios;' 2>/dev/null | xargs)"
echo "   Embarcaciones:   $(psql "$DB_URL" -t -c 'SELECT COUNT(*) FROM embarcaciones;' 2>/dev/null | xargs)"
echo "   Tripulación:     $(psql "$DB_URL" -t -c 'SELECT COUNT(*) FROM tripulacion;' 2>/dev/null | xargs)"
echo "   Pasajeros:       $(psql "$DB_URL" -t -c 'SELECT COUNT(*) FROM pasajeros;' 2>/dev/null | xargs)"
echo "   Viajes:          $(psql "$DB_URL" -t -c 'SELECT COUNT(*) FROM viajes;' 2>/dev/null | xargs)"
echo "   Incidentes:      $(psql "$DB_URL" -t -c 'SELECT COUNT(*) FROM incidentes;' 2>/dev/null | xargs)"
echo "   Notificaciones:  $(psql "$DB_URL" -t -c 'SELECT COUNT(*) FROM notificaciones;' 2>/dev/null | xargs)"

echo ""
echo "6️⃣  Verificando secuencias..."
echo "   Próximo ID viajes:        $(psql "$DB_URL" -t -c "SELECT last_value FROM viajes_id_seq;" 2>/dev/null | xargs)"
echo "   Próximo ID embarcaciones: $(psql "$DB_URL" -t -c "SELECT last_value FROM embarcaciones_id_seq;" 2>/dev/null | xargs)"

echo ""
echo "7️⃣  Verificando zona horaria..."
TIMEZONE=$(psql "$DB_URL" -t -c "SHOW timezone;" 2>/dev/null | xargs)
echo "   🌍 Zona horaria: $TIMEZONE"
if [ "$TIMEZONE" = "America/Bogota" ]; then
    echo "   ✅ Zona horaria correcta"
else
    echo "   ⚠️  Zona horaria no es America/Bogota"
fi

echo ""
echo "=========================================="
echo "✅ VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "📋 Revisa el archivo CHECKLIST_FUNCIONALIDADES.md"
echo "   para una lista completa de funcionalidades"
echo ""
