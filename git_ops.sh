#!/bin/bash
set -e
git add -A
git commit -m "fix: quitar preferencias del sistema, corregir asignacion tripulacion en embarcaciones y datos compras/tickets"
git push
echo "GIT_DONE"
