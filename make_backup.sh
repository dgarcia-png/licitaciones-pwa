#!/bin/bash
# make_backup.sh — Forgeser PWA Frontend
# Genera un backup completo de todos los archivos fuente

DATE=$(date +%Y%m%d)
DEST=~/Desktop/FRONTEND_${DATE}.txt
PROJECT_DIR=~/Desktop/licitaciones-pwa

echo "📦 Generando backup frontend → $DEST"
> "$DEST"

# src/ — todos los tsx, ts
find "$PROJECT_DIR/src" -type f \( -name "*.tsx" -o -name "*.ts" \) | sort | while read f; do
    echo "=== $f ===" >> "$DEST"
    cat "$f" >> "$DEST"
    echo "" >> "$DEST"
done

# public/sw.js
if [ -f "$PROJECT_DIR/public/sw.js" ]; then
    echo "=== $PROJECT_DIR/public/sw.js ===" >> "$DEST"
    cat "$PROJECT_DIR/public/sw.js" >> "$DEST"
    echo "" >> "$DEST"
fi

# package.json y vite.config
for f in package.json vite.config.ts vite.config.js tsconfig.json; do
    if [ -f "$PROJECT_DIR/$f" ]; then
        echo "=== $PROJECT_DIR/$f ===" >> "$DEST"
        cat "$PROJECT_DIR/$f" >> "$DEST"
        echo "" >> "$DEST"
    fi
done

LINES=$(wc -l < "$DEST")
SIZE=$(du -sh "$DEST" | cut -f1)
echo "✅ Frontend backup: $LINES líneas · $SIZE → $DEST"
