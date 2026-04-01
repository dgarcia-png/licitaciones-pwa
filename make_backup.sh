#!/bin/bash
# ============================================================================
# make_backup.sh — Genera backup de GAS y Frontend en formato .txt
# Uso: bash make_backup.sh
# Genera: GAS_YYYYMMDD.txt y FRONTEND_YYYYMMDD.txt en ~/Desktop/licitaciones-pwa/
# ============================================================================

PROYECTO="$HOME/Desktop/licitaciones-pwa"
FECHA=$(date +%Y%m%d)
GAS_OUT="$PROYECTO/GAS_${FECHA}.txt"
FRONTEND_OUT="$PROYECTO/FRONTEND_${FECHA}.txt"

echo "🔄 Generando backup del proyecto Forgeser..."
echo "   Fecha: $FECHA"
echo "   Proyecto: $PROYECTO"
echo ""

# ── GAS BACKUP ───────────────────────────────────────────────────────────────
echo "📦 Generando GAS_${FECHA}.txt..."
> "$GAS_OUT"  # vaciar o crear

# Buscar archivos .gs y .js en gas-backup/, ordenados por nombre
find "$PROYECTO/gas-backup" -type f \( -name "*.gs" -o -name "*.js" \) | sort | while read -r file; do
  echo "ARCHIVO: $file" >> "$GAS_OUT"
  echo "==========================================" >> "$GAS_OUT"
  cat "$file" >> "$GAS_OUT"
  echo "" >> "$GAS_OUT"
  echo "==========================================" >> "$GAS_OUT"
done

GAS_FILES=$(find "$PROYECTO/gas-backup" -type f \( -name "*.gs" -o -name "*.js" \) | wc -l | tr -d ' ')
echo "   ✅ $GAS_FILES archivos GAS → GAS_${FECHA}.txt"

# ── FRONTEND BACKUP ──────────────────────────────────────────────────────────
echo "📦 Generando FRONTEND_${FECHA}.txt..."
> "$FRONTEND_OUT"

# Archivos relevantes del frontend (excluyendo node_modules, dist, .vite)
find "$PROYECTO/src" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) \
  | grep -v "node_modules" \
  | grep -v "\.d\.ts" \
  | sort \
  | while read -r file; do
    # Ruta relativa desde el proyecto
    rel="${file#$PROYECTO/}"
    echo "ARCHIVO: $rel" >> "$FRONTEND_OUT"
    echo "==========================================" >> "$FRONTEND_OUT"
    cat "$file" >> "$FRONTEND_OUT"
    echo "" >> "$FRONTEND_OUT"
    echo "==========================================" >> "$FRONTEND_OUT"
  done

# Añadir también archivos de configuración raíz
for conf in "vite.config.ts" "tsconfig.json" "package.json" "tailwind.config.js" "tailwind.config.ts" "index.html"; do
  if [ -f "$PROYECTO/$conf" ]; then
    echo "ARCHIVO: $conf" >> "$FRONTEND_OUT"
    echo "==========================================" >> "$FRONTEND_OUT"
    cat "$PROYECTO/$conf" >> "$FRONTEND_OUT"
    echo "" >> "$FRONTEND_OUT"
    echo "==========================================" >> "$FRONTEND_OUT"
  fi
done

FRONTEND_FILES=$(find "$PROYECTO/src" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | grep -v "\.d\.ts" | wc -l | tr -d ' ')
echo "   ✅ $FRONTEND_FILES archivos frontend → FRONTEND_${FECHA}.txt"

# ── RESUMEN ──────────────────────────────────────────────────────────────────
echo ""
echo "✅ Backup completado:"
GAS_SIZE=$(du -sh "$GAS_OUT" | cut -f1)
FRONTEND_SIZE=$(du -sh "$FRONTEND_OUT" | cut -f1)
echo "   GAS_${FECHA}.txt        → $GAS_SIZE"
echo "   FRONTEND_${FECHA}.txt   → $FRONTEND_SIZE"
echo ""
echo "💡 Para subir a Claude como contexto del proyecto,"
echo "   sube ambos archivos en la configuración del Project."
