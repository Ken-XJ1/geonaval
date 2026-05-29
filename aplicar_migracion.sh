#!/bin/bash

# Script para aplicar la migración de zona horaria y limpieza de datos
# Uso: ./aplicar_migracion.sh

echo "🔧 Aplicando migración de zona horaria y limpieza de datos..."
echo ""

# Leer DATABASE_URL del archivo .env
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
else
    echo "❌ Error: No se encontró el archivo .env"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurado en .env"
    exit 1
fi

echo "📊 Conectando a la base de datos..."
echo ""

# Aplicar el script SQL
psql "$DATABASE_URL" -f aplicar_migraciones.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migración aplicada exitosamente"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Reinicia el servidor backend: npm run dev"
    echo "2. Recarga la aplicación en el navegador (Ctrl + Shift + R)"
    echo "3. Crea un nuevo viaje para verificar que las fechas sean correctas"
    echo ""
else
    echo ""
    echo "❌ Error al aplicar la migración"
    echo "Verifica que PostgreSQL esté instalado y que la URL de conexión sea correcta"
    echo ""
    exit 1
fi
