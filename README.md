# Plataforma HAVOC

Una base, módulos a la carta. Cada cliente es una **instalación propia** (su servidor/puerto, su base
de datos, su nombre y color) con solo los módulos que contrató.

```
backend/src/            núcleo: login, usuarios, permisos por módulo, cargador de módulos
backend/modulos/<clave>/  index.js ({ nombre, router }) + migrations/*.sql
frontend/src/modulos/<clave>/  index.jsx ({ descripcion, Icono, menu, Rutas })
```

## Instalar para un cliente

En Hetzner, todo de una vez (no pisa nada existente: revisa carpeta, PM2, puertos y sitio nginx):

```
./instalar.sh <instancia> <puerto_backend> <puerto_db> <puerto_web> "<Cliente>" "<#color>" "<modulos>" <email_admin> "<Nombre admin>"
./deploy.sh <instancia>          # actualizaciones posteriores
```
Demo para leads: después de instalar, `sudo -u apps node src/scripts/demo_datos.js` en el backend de la instancia.

A mano (local o en otro servidor):

1. `cp backend/.env.example backend/.env` (solo si no existe) y llenar:
   - `CLIENTE_NOMBRE="Abarrotes La Esperanza"`, `CLIENTE_COLOR="#0F766E"` (con comillas: `#` es comentario en .env)
   - `MODULOS=pos` — módulos instalados, separados por coma
   - puertos, BD, `JWT_SECRET` (`openssl rand -hex 32`), `CORS_ORIGINS`
2. `docker compose -p <cliente> --env-file backend/.env up -d` · `cd backend && npm install && npm start` (aplica migraciones del núcleo y de cada módulo)
3. `node src/scripts/seed_admin.js dueño@cliente.com "Nombre"` → imprime contraseña temporal
4. `cd frontend && npm install && npm run build` → servir `dist/` con Nginx y `/api` al backend

**Agregar un módulo después:** añadirlo a `MODULOS` y reiniciar. Sus tablas se crean solas.
**Quitarlo:** sacarlo de `MODULOS`; deja de verse y de responder, los datos quedan en la BD.

Permisos: el **admin** entra a todo; cada **usuario** solo a los módulos que el admin le marca en *Usuarios*.

## Crear un módulo

- Backend: `backend/modulos/<clave>/index.js` exporta `{ nombre, router, publico? }` (`publico`: rutas sin sesión en `/api/<clave>/publico`, p. ej. dispositivos). Se monta en `/api/<clave>`
  ya protegido (sesión + acceso al módulo). Tablas con prefijo `<clave>_` en `migrations/NNN_*.sql`.
- Frontend: `frontend/src/modulos/<clave>/index.jsx` exporta por defecto
  `{ descripcion, Icono, menu: [{ to, label }], Rutas }`. Se registra solo (no hay lista que editar).
  Rutas propias bajo `/<clave>/*`.

## Módulos

| Clave | Módulo | Origen |
|---|---|---|
| `personal` | Personal: expedientes, 17 tipos de documento con formatos descargables, generador de contratos (4 tipos, .docx), pagos semanales desde PDF BBVA, checador biométrico (agente local con `x-api-key` en `/api/personal/publico/checador/*`) | HAVOC Control / Elys / RHATA |
| `pos` | Punto de venta: vender con código de barras (pieza o granel), clientes, abrir/cerrar caja con corte, cancelaciones, inventario con entradas/ajustes/bitácora, proveedores, reportes de ganancia | POS farmacia de Gioval, generalizado |
