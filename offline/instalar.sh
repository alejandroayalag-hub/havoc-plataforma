#!/bin/bash
# Instala o actualiza la plataforma en una caja Ubuntu que después trabajará SIN internet.
# La PRIMERA instalación necesita internet (apt + Chrome). Las actualizaciones no.
#
# Primera vez:  sudo ./instalar.sh "<Cliente>" "<#color>" "<modulos>" <email_admin> "<Nombre admin>"
#   ej.         sudo ./instalar.sh "Abarrotes El Palmito" "#15803D" "pos" alexis@correo.com "Alexis Norato"
# Actualizar:   sudo ./instalar.sh          (cambia código, conserva .env, datos y respaldos)
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "✗ correr con sudo"; exit 1; }
AQUI="$(cd "$(dirname "$0")" && pwd)"
INST="$(cat "$AQUI/INSTANCIA")"
APP="/opt/$INST"
PORT=3022
USUARIO_ESCRITORIO="${SUDO_USER:?correr con sudo desde el usuario de la caja}"

copiar_codigo() {
  mkdir -p "$APP"
  rsync -a --delete --exclude .env --exclude uploads/ "$AQUI/backend/" "$APP/backend/"
  rsync -a --delete "$AQUI/frontend/dist/" "$APP/frontend/dist/"
  install -m 755 "$AQUI/respaldo.sh" "$APP/respaldo.sh"
  chown -R "$INST:$INST" "$APP"
}

# ── Actualización ──
if [ -f "$APP/backend/.env" ]; then
  echo "→ Actualizando $INST (se conserva .env y la BD)..."
  "$APP/respaldo.sh"   # respaldo antes de migrar
  copiar_codigo
  systemctl restart "$INST"
  for i in $(seq 30); do curl -sf "localhost:$PORT/api/health" >/dev/null && break; sleep 1; done
  curl -sf "localhost:$PORT/api/health" >/dev/null || { journalctl -u "$INST" -n 30; echo "✗ no arrancó"; exit 1; }
  echo "✓ $INST actualizado"; exit 0
fi

# ── Primera instalación ──
NOMBRE="${1:?falta nombre del cliente}"; COLOR="${2:?falta color}"; MODULOS="${3:?faltan módulos}"
ADMIN_EMAIL="${4:?falta email admin}"; ADMIN_NOMBRE="${5:?falta nombre admin}"

echo "→ Hora de México (sin internet no hay sincronización: revisar reloj en cada visita)..."
timedatectl set-timezone America/Mexico_City

echo "→ Paquetes..."
apt-get update -q
apt-get install -y -q postgresql nodejs curl rsync
NODE_MAYOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAYOR" -ge 18 ] || { echo "✗ Node $NODE_MAYOR muy viejo (se necesita 18+): usar Ubuntu 24.04"; exit 1; }
if ! command -v google-chrome >/dev/null; then
  curl -fsSL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y -q /tmp/chrome.deb && rm /tmp/chrome.deb
fi

echo "→ Base de datos..."
DB="${INST//-/_}"; DBPASS="$(openssl rand -hex 24)"
runuser -u postgres -- psql -q -c "CREATE ROLE ${DB}_user LOGIN PASSWORD '$DBPASS'"
runuser -u postgres -- createdb -O "${DB}_user" "$DB"

echo "→ Aplicación en $APP..."
id "$INST" >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin "$INST"
copiar_codigo
echo "$INST" > /opt/havoc-instancia
umask 077
cat > "$APP/backend/.env" <<EOF
PORT=$PORT
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB
DB_USER=${DB}_user
DB_PASSWORD=$DBPASS
JWT_SECRET=$(openssl rand -hex 32)
CLIENTE_NOMBRE="$NOMBRE"
CLIENTE_COLOR="$COLOR"
MODULOS=$MODULOS
CORS_ORIGINS=
FRONTEND_DIST=$APP/frontend/dist
EOF
umask 022
chown "$INST:$INST" "$APP/backend/.env"

cat > "/etc/systemd/system/$INST.service" <<EOF
[Unit]
Description=Plataforma HAVOC ($NOMBRE)
After=postgresql.service
Requires=postgresql.service

[Service]
User=$INST
WorkingDirectory=$APP/backend
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now "$INST"
for i in $(seq 30); do curl -sf "localhost:$PORT/api/health" >/dev/null && break; sleep 1; done
curl -sf "localhost:$PORT/api/health" >/dev/null || { journalctl -u "$INST" -n 30; echo "✗ no arrancó"; exit 1; }

echo "→ Respaldo cada hora (disco + USB conectada)..."
echo "0 * * * * root $APP/respaldo.sh" > "/etc/cron.d/$INST-respaldo"
"$APP/respaldo.sh"

echo "→ Chrome a pantalla completa al iniciar sesión, ticket directo a la impresora predeterminada..."
AUTO="/home/$USUARIO_ESCRITORIO/.config/autostart"
mkdir -p "$AUTO"
cat > "$AUTO/$INST.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=$NOMBRE
Exec=sh -c 'until curl -sf localhost:$PORT/api/health; do sleep 1; done; google-chrome --kiosk --kiosk-printing --no-first-run --password-store=basic http://localhost:$PORT'
X-GNOME-Autostart-enabled=true
EOF
cp "$AUTO/$INST.desktop" "/home/$USUARIO_ESCRITORIO/Escritorio/" 2>/dev/null || true
chown -R "$USUARIO_ESCRITORIO:" "/home/$USUARIO_ESCRITORIO/.config"

echo "→ Admin:"
(cd "$APP/backend" && runuser -u "$INST" -- node src/scripts/seed_admin.js "$ADMIN_EMAIL" "$ADMIN_NOMBRE")
echo "✓ Listo: http://localhost:$PORT  · falta configurar la impresora como predeterminada (ver LEEME.md)"
