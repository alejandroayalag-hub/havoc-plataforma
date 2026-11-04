#!/bin/bash
# Respaldo de la BD de la caja. Lo corre cron cada hora (la PC se apaga de noche).
# Deja un archivo por día en /var/backups/<instancia> (60 días) y lo copia a cualquier USB conectada.
set -euo pipefail

INST="$(cat /opt/havoc-instancia)"
DB="${INST//-/_}"
D="/var/backups/$INST"
F="$D/$INST-$(date +%F).sql.gz"

mkdir -p "$D"
runuser -u postgres -- pg_dump "$DB" | gzip > "$F.tmp"
mv "$F.tmp" "$F"
find "$D" -name '*.sql.gz' -mtime +60 -delete

for usb in /media/*/*/; do
  [ -w "$usb" ] || continue
  mkdir -p "$usb/respaldos-$INST" && cp "$F" "$usb/respaldos-$INST/" && sync
done
