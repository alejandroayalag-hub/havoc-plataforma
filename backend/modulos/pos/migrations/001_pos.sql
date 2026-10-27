-- Módulo Punto de venta: productos, proveedores, clientes, cajas, ventas y movimientos de inventario.
-- Cantidades con 3 decimales para vender a granel (kg, litros, metros).

CREATE TABLE pos_proveedores (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  contacto   VARCHAR(150),
  telefono   VARCHAR(30),
  email      VARCHAR(150),
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pos_productos (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(200) NOT NULL,
  codigo_barras VARCHAR(60) UNIQUE,
  categoria     VARCHAR(80),
  unidad        VARCHAR(10) NOT NULL DEFAULT 'pza' CHECK (unidad IN ('pza', 'kg', 'lt', 'm')),
  precio_costo  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_costo >= 0),
  precio_venta  NUMERIC(12,2) NOT NULL CHECK (precio_venta > 0),
  stock         NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo  NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  proveedor_id  INTEGER REFERENCES pos_proveedores(id) ON DELETE SET NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX pos_productos_nombre_idx ON pos_productos (lower(nombre));

CREATE TABLE pos_clientes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  telefono      VARCHAR(30),
  ultima_compra TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pos_cajas (
  id                SERIAL PRIMARY KEY,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id),
  estado            VARCHAR(10) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  abierta_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  efectivo_inicial  NUMERIC(12,2) NOT NULL CHECK (efectivo_inicial >= 0),
  cerrada_en        TIMESTAMPTZ,
  efectivo_final    NUMERIC(12,2),
  efectivo_esperado NUMERIC(12,2),
  diferencia        NUMERIC(12,2)
);
-- Una sola caja abierta por usuario
CREATE UNIQUE INDEX pos_cajas_una_abierta ON pos_cajas (usuario_id) WHERE estado = 'abierta';

CREATE TABLE pos_ventas (
  id            SERIAL PRIMARY KEY,
  caja_id       INTEGER NOT NULL REFERENCES pos_cajas(id),
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
  cliente_id    INTEGER REFERENCES pos_clientes(id) ON DELETE SET NULL,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total         NUMERIC(12,2) NOT NULL,
  metodo_pago   VARCHAR(15) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
  recibido      NUMERIC(12,2),
  estado        VARCHAR(10) NOT NULL DEFAULT 'pagada' CHECK (estado IN ('pagada', 'cancelada')),
  cancelada_por INTEGER REFERENCES usuarios(id),
  cancelada_en  TIMESTAMPTZ
);
CREATE INDEX pos_ventas_fecha_idx ON pos_ventas (fecha);
CREATE INDEX pos_ventas_caja_idx ON pos_ventas (caja_id);

-- Nombre y precios copiados al vender: el ticket y la ganancia no cambian si después se edita el producto
CREATE TABLE pos_venta_items (
  id              SERIAL PRIMARY KEY,
  venta_id        INTEGER NOT NULL REFERENCES pos_ventas(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES pos_productos(id),
  nombre          VARCHAR(200) NOT NULL,
  cantidad        NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL,
  costo_unitario  NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL
);

-- Bitácora de inventario: entradas de mercancía y ajustes por conteo físico
CREATE TABLE pos_movimientos (
  id          SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES pos_productos(id) ON DELETE CASCADE,
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'ajuste')),
  cantidad    NUMERIC(12,3) NOT NULL,  -- con signo: lo que se sumó o restó
  costo_unitario NUMERIC(12,2),
  nota        TEXT,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
