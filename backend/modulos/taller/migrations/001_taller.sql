-- Módulo Bitácora automotriz: vehículos y su historial de servicios (empaquetado de AutoFix).

CREATE TABLE taller_vehiculos (
  id          SERIAL PRIMARY KEY,
  placas      VARCHAR(15) NOT NULL UNIQUE,
  marca       VARCHAR(60) NOT NULL,
  modelo      VARCHAR(60) NOT NULL,
  anio        SMALLINT,
  color       VARCHAR(30),
  propietario VARCHAR(150) NOT NULL,
  telefono    VARCHAR(30),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE taller_servicios (
  id          SERIAL PRIMARY KEY,
  vehiculo_id INTEGER NOT NULL REFERENCES taller_vehiculos(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  kilometraje INTEGER CHECK (kilometraje >= 0),
  motivo      TEXT NOT NULL,
  trabajos    TEXT,
  costo       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  estado      VARCHAR(12) NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'en_proceso', 'entregado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX taller_servicios_vehiculo_idx ON taller_servicios (vehiculo_id, fecha DESC);
