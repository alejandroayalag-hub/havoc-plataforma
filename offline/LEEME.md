# Caja sin internet

## Preparar la PC (en la oficina, CON internet)
1. Ubuntu Desktop 24.04, usuario de la caja con **inicio de sesión automático**.
   Configuración → Energía: nunca suspender ni apagar pantalla; sin bloqueo de pantalla.
2. Copiar el paquete (`./offline/empaquetar.sh <instancia>`) y correr:
   `tar xzf <instancia>-offline-*.tar.gz && cd <instancia>-offline && sudo ./instalar.sh "<Cliente>" "<#color>" "pos" <email> "<Nombre>"`
   Anotar la contraseña temporal que imprime al final.
3. Impresora térmica 80 mm: Configuración → Impresoras → agregar (driver del fabricante si no la reconoce)
   y marcarla **predeterminada**. Chrome imprime el ticket directo ahí, sin preguntar.
4. Reiniciar: debe entrar solo al POS. Hacer una venta de prueba con ticket.
5. Desconectar internet. Llevar a la tienda.

## En la tienda
- **Salir de la pantalla completa:** Alt+F4. Para volver a abrirlo, usar el ícono del escritorio o reiniciar la PC.
- **Respaldo:** cada hora se guarda en `/var/backups/<instancia>` y en cualquier USB conectada
  (carpeta `respaldos-<instancia>`). Dejar una USB conectada siempre y llevarse otra cada semana.
- **Reloj:** sin internet se puede atrasar. Revisar fecha y hora en cada visita, porque afecta los cortes.

## Actualizar (en visita, sin internet)
Paquete nuevo en USB → `tar xzf ... && cd <instancia>-offline && sudo ./instalar.sh` (sin argumentos).
Hace respaldo antes, conserva `.env` y los datos.

## Restaurar un respaldo
```
sudo systemctl stop <instancia>
sudo -u postgres dropdb <bd> && sudo -u postgres createdb -O <bd>_user <bd>
gunzip -c respaldo.sql.gz | sudo -u postgres psql -q <bd>
sudo systemctl start <instancia>
```
(`<bd>` = instancia con `_` en vez de `-`; en El Palmito: `palmito`.)
