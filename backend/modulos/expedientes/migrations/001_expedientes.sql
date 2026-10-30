-- Módulo Expediente digital: expedientes con sus documentos (empaquetado de Expediente MX).

CREATE TABLE expedientes_expedientes (
  id         SERIAL PRIMARY KEY,
  numero     VARCHAR(40) NOT NULL UNIQUE,
  titulo     VARCHAR(200) NOT NULL,
  cliente    VARCHAR(150),
  materia    VARCHAR(60),
  estado     VARCHAR(10) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  notas      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expedientes_documentos (
  id            SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes_expedientes(id) ON DELETE CASCADE,
  nombre        VARCHAR(255) NOT NULL,
  ruta          TEXT NOT NULL,
  tamano        INTEGER NOT NULL,
  subido_por    VARCHAR(150),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX expedientes_documentos_exp_idx ON expedientes_documentos (expediente_id);
