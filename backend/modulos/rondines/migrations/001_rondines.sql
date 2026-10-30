-- Módulo Rondines: puntos de control con QR y registro de paso del guardia con GPS (empaquetado de Rondines Grupo ATA).

CREATE TABLE rondines_puntos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  descripcion TEXT,
  codigo      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rondines_registros (
  id             SERIAL PRIMARY KEY,
  punto_id       INTEGER NOT NULL REFERENCES rondines_puntos(id) ON DELETE CASCADE,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(150) NOT NULL,
  lat            NUMERIC(9,6),
  lng            NUMERIC(9,6),
  precision_m    INTEGER,
  nota           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX rondines_registros_fecha_idx ON rondines_registros (created_at DESC);
