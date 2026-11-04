#!/bin/bash
# Arma el paquete para una caja SIN internet (corre en la máquina de desarrollo).
# Uso: ./offline/empaquetar.sh <instancia>        → <instancia>-offline-AAAA-MM-DD.tar.gz
# Llevarlo en USB a la caja y ahí: tar xzf ... && cd <instancia>-offline && sudo ./instalar.sh ...
set -euo pipefail

INST="${1:?uso: $0 <instancia>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
PKG="$TMP/$INST-offline"
OUT="$PWD/$INST-offline-$(date +%F).tar.gz"

echo "→ Construyendo frontend..."
(cd "$ROOT/frontend" && npm run build)

echo "→ Copiando backend (sin .env, uploads ni node_modules)..."
mkdir -p "$PKG/frontend"
rsync -a --exclude node_modules/ --exclude .env --exclude uploads/ "$ROOT/backend/" "$PKG/backend/"
cp -r "$ROOT/frontend/dist" "$PKG/frontend/dist"
cp "$ROOT/offline/instalar.sh" "$ROOT/offline/respaldo.sh" "$ROOT/offline/LEEME.md" "$PKG/"
echo "$INST" > "$PKG/INSTANCIA"

echo "→ Dependencias de producción (puro JS, sirven en cualquier Linux x64)..."
(cd "$PKG/backend" && npm ci --omit=dev --silent)

tar czf "$OUT" -C "$TMP" "$INST-offline"
echo "✓ $OUT ($(du -h "$OUT" | cut -f1))"
