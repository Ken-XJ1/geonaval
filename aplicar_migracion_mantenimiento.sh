#!/bin/bash

# Script para aplicar migración de mantenimiento en Render
# Uso: ./aplicar_migracion_mantenimiento.sh

echo "=========================================="
echo "Migración: Campos de Mantenimiento"
echo "=========================================="
echo ""
echo "INSTRUCCIONES:"
echo ""
echo "1. Ve a tu dashboard de Render: https://dashboard.render.com"
echo "2. Selecciona tu base de datos PostgreSQL (geonaval-db)"
echo "3. Haz clic en 'Connect' y copia la 'External Database URL'"
echo "4. Ejecuta este comando en tu terminal (reemplaza la URL):"
echo ""
echo "   psql 'TU_DATABASE_URL_AQUI' < aplicar_migracion_mantenimiento.sql"
echo ""
echo "=========================================="
echo ""
echo "Contenido del archivo SQL a ejecutar:"
echo ""
cat aplicar_migracion_mantenimiento.sql
echo ""
echo "=========================================="
