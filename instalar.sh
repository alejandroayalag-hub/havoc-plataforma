#!/bin/bash
# Instalación NUEVA de la plataforma en Hetzner (una por cliente).
# Uso: ./instalar.sh <instancia> <puerto_backend> <puerto_db> <puerto_web> "<Nombre del cliente>" "<#color>" "<modulos>" <email_admin> "<Nombre admin>"
# Ej.: ./instalar.sh havoc-demo 3020 5449 8103 "Abarrotes La Esperanza" "#0F766E" "pos,personal" demo@havocdev.mx "Dueño Demo"
# Actualizar una instalación existente: ./deploy.sh <instancia>
set -euo pipefail

INST="$1"; PBACK="$2"; PDB="$3"; PWEB="$4"; NOMBRE="$5"; COLOR="$6"; MODULOS="$7"; ADMIN_EMAIL="$8"; ADMIN_NOMBRE="$9"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSHC="ssh -i $HOME/.ssh/id_ed25519 -o IdentitiesOnly=yes"
SERVER="root@62.238.3.136"
DIR="/home/apps/$INST"

# No pisar nada que ya exista (carpeta, proceso o puertos ocupados)
$SSHC $SERVER "test ! -e $DIR || { echo '✗ $DIR ya existe'; exit 1; }
  ! sudo -u apps pm2 describe $INST-backend >/dev/null 2>&1 || { echo '✗ PM2 $INST-backend ya existe'; exit 1; }
  ! ss -ltn | grep -qE ':($PBACK|$PDB|$PWEB)\b' || { echo '✗ algún puerto ya está en uso'; exit 1; }
  test ! -e /etc/nginx/sites-available/$INST || { echo '✗ sitio nginx $INST ya existe'; exit 1; }"

echo "→ Construyendo frontend..."
(cd "$ROOT_DIR/frontend" && npm run build)

echo "→ Subiendo archivos..."
$SSHC $SERVER "mkdir -p $DIR/backend $DIR/frontend/dist && chown -R apps:apps $DIR"
rsync -az --chown=apps:apps -e "$SSHC" --exclude node_modules/ --exclude .env --exclude uploads/ \
  "$ROOT_DIR/backend/" $SERVER:$DIR/backend/
rsync -az --chown=apps:apps -e "$SSHC" "$ROOT_DIR/docker-compose.yml" $SERVER:$DIR/
rsync -az --chown=apps:apps -e "$SSHC" "$ROOT_DIR/frontend/dist/" $SERVER:$DIR/frontend/dist/

echo "→ .env con secretos nuevos (solo vive en el servidor)..."
DBNAME="${INST//-/_}"
$SSHC $SERVER "umask 077 && cat > $DIR/backend/.env <<EOF
PORT=$PBACK
DB_HOST=localhost
DB_PORT=$PDB
DB_NAME=$DBNAME
DB_USER=${DBNAME}_user
DB_PASSWORD=\$(openssl rand -hex 24)
JWT_SECRET=\$(openssl rand -hex 32)
CLIENTE_NOMBRE=\"$NOMBRE\"
CLIENTE_COLOR=\"$COLOR\"
MODULOS=$MODULOS
CORS_ORIGINS=http://62.238.3.136:$PWEB
EOF
chown apps:apps $DIR/backend/.env"

echo "→ Base de datos..."
$SSHC $SERVER "cd $DIR && docker compose -p $INST --env-file backend/.env up -d \
  && for i in \$(seq 30); do docker compose -p $INST --env-file backend/.env exec -T postgres pg_isready -q && break; sleep 1; done"

echo "→ Backend (PM2 como apps)..."
$SSHC $SERVER "cd $DIR/backend && sudo -u apps npm install --omit=dev --silent \
  && sudo -u apps pm2 start src/index.js --name $INST-backend --cwd $DIR/backend && sudo -u apps pm2 save"

echo "→ Nginx :$PWEB..."
$SSHC $SERVER "cat > /etc/nginx/sites-available/$INST <<'EOF'
server {
    listen $PWEB;
    server_name _;
    client_max_body_size 25M;

    root $DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:$PBACK;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
}
EOF
ln -s /etc/nginx/sites-available/$INST /etc/nginx/sites-enabled/$INST && nginx -t && systemctl reload nginx && ufw allow $PWEB/tcp"

echo "→ Verificando..."
sleep 3
$SSHC $SERVER "sudo -u apps pm2 show $INST-backend | grep -E 'status|uptime|restarts'; curl -s http://localhost:$PWEB/api/config; echo"

echo "→ Admin:"
$SSHC $SERVER "cd $DIR/backend && sudo -u apps node src/scripts/seed_admin.js '$ADMIN_EMAIL' '$ADMIN_NOMBRE'"
echo "✓ $INST en http://62.238.3.136:$PWEB"
