#!/bin/bash
# ============================================================================
# restore_from_backup.sh — Extrae archivos individuales desde un .txt de backup
#
# Uso:
#   bash restore_from_backup.sh FRONTEND_20260402.txt          # extrae todo
#   bash restore_from_backup.sh FRONTEND_20260402.txt src/pages/HorasExtrasPage.tsx
#   bash restore_from_backup.sh GAS_20260402.txt gas-backup/28_incidencias_sla.gs
#
# ⚠️  Sin segundo argumento: extrae TODOS los archivos (sobrescribe existentes)
#     Con segundo argumento: extrae solo ese archivo específico
# ============================================================================

PROYECTO="$HOME/Desktop/licitaciones-pwa"
BACKUP_FILE="$1"
ARCHIVO_FILTRO="$2"

# ── Validaciones ─────────────────────────────────────────────────────────────
if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Uso: bash restore_from_backup.sh <archivo_backup.txt> [archivo_a_extraer]"
  echo ""
  echo "Ejemplos:"
  echo "  bash restore_from_backup.sh FRONTEND_20260402.txt"
  echo "  bash restore_from_backup.sh FRONTEND_20260402.txt src/pages/HorasExtrasPage.tsx"
  echo "  bash restore_from_backup.sh GAS_20260402.txt gas-backup/28_incidencias_sla.gs"
  exit 1
fi

# Resolver ruta absoluta del backup
if [[ "$BACKUP_FILE" != /* ]]; then
  BACKUP_FILE="$PROYECTO/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ No se encuentra: $BACKUP_FILE"
  exit 1
fi

echo "📂 Leyendo: $(basename $BACKUP_FILE)"
if [ -n "$ARCHIVO_FILTRO" ]; then
  echo "🎯 Extrayendo solo: $ARCHIVO_FILTRO"
fi
echo ""

# ── Extracción ────────────────────────────────────────────────────────────────
EXTRAIDOS=0
OMITIDOS=0
ARCHIVO_ACTUAL=""
CONTENIDO=""
EN_ARCHIVO=0

# Función para escribir el archivo actual acumulado
escribir_archivo() {
  if [ -z "$ARCHIVO_ACTUAL" ] || [ -z "$CONTENIDO" ]; then return; fi

  # Si hay filtro, solo extraer el archivo específico
  if [ -n "$ARCHIVO_FILTRO" ]; then
    if [[ "$ARCHIVO_ACTUAL" != *"$ARCHIVO_FILTRO"* ]]; then
      OMITIDOS=$((OMITIDOS + 1))
      return
    fi
  fi

  # Determinar ruta de destino
  # Si la ruta empieza con /Users/... o /home/..., extraer solo la parte relativa al proyecto
  DEST="$ARCHIVO_ACTUAL"
  if [[ "$DEST" == /Users/*/Desktop/licitaciones-pwa/* ]]; then
    DEST="${DEST#*/Desktop/licitaciones-pwa/}"
  fi
  if [[ "$DEST" == /* ]]; then
    # Ruta absoluta desconocida — usar solo el nombre del archivo
    DEST=$(basename "$DEST")
  fi

  DEST_FULL="$PROYECTO/$DEST"

  # Crear directorio si no existe
  mkdir -p "$(dirname "$DEST_FULL")"

  # Escribir contenido (quitar el último salto de línea extra del separador)
  printf '%s' "$CONTENIDO" | sed '$ { /^[[:space:]]*$/d }' > "$DEST_FULL"

  echo "   ✅ $DEST"
  EXTRAIDOS=$((EXTRAIDOS + 1))
}

# Leer el archivo línea a línea
while IFS= read -r linea; do
  if [[ "$linea" == "ARCHIVO: "* ]]; then
    # Guardar archivo anterior
    escribir_archivo
    # Iniciar nuevo archivo
    ARCHIVO_ACTUAL="${linea#ARCHIVO: }"
    CONTENIDO=""
    EN_ARCHIVO=0
  elif [[ "$linea" == "==========================================" ]]; then
    if [ $EN_ARCHIVO -eq 0 ]; then
      EN_ARCHIVO=1  # Primera línea de separador = inicio de contenido
    else
      # Segunda línea de separador = fin de contenido (no la añadimos)
      EN_ARCHIVO=0
    fi
  elif [ $EN_ARCHIVO -eq 1 ]; then
    CONTENIDO="${CONTENIDO}${linea}
"
  fi
done < "$BACKUP_FILE"

# Guardar último archivo
escribir_archivo

# ── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo "✅ Extracción completada:"
echo "   Archivos extraídos: $EXTRAIDOS"
if [ $OMITIDOS -gt 0 ]; then
  echo "   Archivos omitidos (filtro): $OMITIDOS"
fi

if [ $EXTRAIDOS -gt 0 ] && [ -z "$ARCHIVO_FILTRO" ]; then
  echo ""
  echo "💡 Para compilar y desplegar:"
  echo "   cd $PROYECTO && npm run build"
  echo "   npx vercel build --prod && npx vercel deploy --prebuilt --prod"
fi
