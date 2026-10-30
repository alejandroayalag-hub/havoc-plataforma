#!/bin/bash
# Uso: ./deploy.sh <instancia>   → /home/apps/<instancia> en Hetzner, PM2 "<instancia>-backend"
# El .env de cada instancia vive solo en el servidor.
set -e
INSTANCIA="${1:?Uso: ./deploy.sh <instancia>}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="root@62.238.3.136"
SSH="ssh -i $HOME/.ssh/id_ed25519 -o IdentitiesOnly=yes"

echo "→ Construyendo frontend..."
(cd "$ROOT_DIR/frontend" && npm run build)

echo "→ Sincronizando backend completo..."
rsync -az --delete --chown=apps:apps -e "$SSH" \
  --exclude='node_modules/' --exclude='.env' --exclude='uploads/' \
  "$ROOT_DIR/backend/" $SERVER:/home/apps/$INSTANCIA/backend/

echo "→ Sincronizando frontend..."
rsync -az --delete --chown=apps:apps -e "$SSH" \
  "$ROOT_DIR/frontend/dist/" $SERVER:/home/apps/$INSTANCIA/frontend/dist/

echo "→ Dependencias y reinicio..."
$SSH $SERVER "cd /home/apps/$INSTANCIA/backend && sudo -u apps npm install --omit=dev --silent && sudo -u apps pm2 restart $INSTANCIA-backend"
sleep 2
$SSH $SERVER "sudo -u apps pm2 show $INSTANCIA-backend | grep -E 'status|restarts'"
echo "✓ $INSTANCIA desplegada"
