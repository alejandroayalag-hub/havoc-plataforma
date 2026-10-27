-- Módulo Personal: expedientes, documentos, contratos, pagos semanales y checador biométrico
-- (de HAVOC Control / Elys; tablas con prefijo personal_)

CREATE TABLE public.personal_checadas (
    id integer NOT NULL,
    empleado_id integer NOT NULL,
    dispositivo_id integer NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    tipo character varying(10) DEFAULT 'entrada'::character varying NOT NULL,
    uid_checador integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT personal_checadas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'salida'::character varying, 'desconocido'::character varying])::text[])))
);

CREATE SEQUENCE public.personal_checadas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_checadas_id_seq OWNED BY public.personal_checadas.id;

CREATE TABLE public.personal_checadores (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    ubicacion character varying(150),
    ip character varying(45),
    api_key character varying(64) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.personal_checadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_checadores_id_seq OWNED BY public.personal_checadores.id;

CREATE TABLE public.personal_checador_empleados (
    id integer NOT NULL,
    empleado_id integer NOT NULL,
    dispositivo_id integer NOT NULL,
    uid_checador integer NOT NULL
);

CREATE SEQUENCE public.personal_checador_empleados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_checador_empleados_id_seq OWNED BY public.personal_checador_empleados.id;

CREATE TABLE public.personal_documentos (
    id integer NOT NULL,
    empleado_id integer NOT NULL,
    tipo_documento_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    ruta character varying(500) NOT NULL,
    estatus character varying(20) DEFAULT 'completo'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT personal_documentos_estatus_check CHECK (((estatus)::text = ANY ((ARRAY['completo'::character varying, 'pendiente'::character varying, 'vencido'::character varying])::text[])))
);

CREATE SEQUENCE public.personal_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_documentos_id_seq OWNED BY public.personal_documentos.id;

CREATE TABLE public.personal_empleados (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido_paterno character varying(100) NOT NULL,
    apellido_materno character varying(100),
    curp character(18),
    rfc character varying(13),
    fecha_nacimiento date,
    fecha_ingreso date DEFAULT CURRENT_DATE NOT NULL,
    puesto character varying(100),
    departamento character varying(100),
    telefono character varying(20),
    email character varying(150),
    direccion text,
    nombre_beneficiario character varying(200),
    foto character varying(500),
    observaciones text,
    estatus character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contacto_emergencia_nombre text,
    contacto_emergencia_telefono character varying(20),
    CONSTRAINT personal_empleados_estatus_check CHECK (((estatus)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'baja'::character varying])::text[])))
);

CREATE SEQUENCE public.personal_empleados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_empleados_id_seq OWNED BY public.personal_empleados.id;

CREATE TABLE public.personal_pagos (
    id integer NOT NULL,
    semana_pago_id integer NOT NULL,
    empleado_id integer,
    nombre_pdf character varying(200) NOT NULL,
    cuenta character varying(50),
    monto numeric(12,2),
    autorizado character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.personal_pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_pagos_id_seq OWNED BY public.personal_pagos.id;

CREATE TABLE public.personal_semanas_pago (
    id integer NOT NULL,
    semana integer NOT NULL,
    anio integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
    filename character varying(255) NOT NULL,
    ruta character varying(500) NOT NULL,
    total_registros integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.personal_semanas_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_semanas_pago_id_seq OWNED BY public.personal_semanas_pago.id;

CREATE TABLE public.personal_tipos_documento (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    requerido boolean DEFAULT true NOT NULL,
    formato_ruta text
);

CREATE SEQUENCE public.personal_tipos_documento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.personal_tipos_documento_id_seq OWNED BY public.personal_tipos_documento.id;

ALTER TABLE ONLY public.personal_checadas ALTER COLUMN id SET DEFAULT nextval('public.personal_checadas_id_seq'::regclass);

ALTER TABLE ONLY public.personal_checadores ALTER COLUMN id SET DEFAULT nextval('public.personal_checadores_id_seq'::regclass);

ALTER TABLE ONLY public.personal_checador_empleados ALTER COLUMN id SET DEFAULT nextval('public.personal_checador_empleados_id_seq'::regclass);

ALTER TABLE ONLY public.personal_documentos ALTER COLUMN id SET DEFAULT nextval('public.personal_documentos_id_seq'::regclass);

ALTER TABLE ONLY public.personal_empleados ALTER COLUMN id SET DEFAULT nextval('public.personal_empleados_id_seq'::regclass);

ALTER TABLE ONLY public.personal_pagos ALTER COLUMN id SET DEFAULT nextval('public.personal_pagos_id_seq'::regclass);

ALTER TABLE ONLY public.personal_semanas_pago ALTER COLUMN id SET DEFAULT nextval('public.personal_semanas_pago_id_seq'::regclass);

ALTER TABLE ONLY public.personal_tipos_documento ALTER COLUMN id SET DEFAULT nextval('public.personal_tipos_documento_id_seq'::regclass);

ALTER TABLE ONLY public.personal_checadas
    ADD CONSTRAINT personal_checadas_dispositivo_id_uid_checador_timestamp_key UNIQUE (dispositivo_id, uid_checador, "timestamp");

ALTER TABLE ONLY public.personal_checadas
    ADD CONSTRAINT personal_checadas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal_checadores
    ADD CONSTRAINT personal_checadores_api_key_key UNIQUE (api_key);

ALTER TABLE ONLY public.personal_checadores
    ADD CONSTRAINT personal_checadores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal_checador_empleados
    ADD CONSTRAINT personal_checador_empleados_dispositivo_id_uid_checador_key UNIQUE (dispositivo_id, uid_checador);

ALTER TABLE ONLY public.personal_checador_empleados
    ADD CONSTRAINT personal_checador_empleados_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal_documentos
    ADD CONSTRAINT personal_documentos_empleado_id_tipo_documento_id_key UNIQUE (empleado_id, tipo_documento_id);

ALTER TABLE ONLY public.personal_documentos
    ADD CONSTRAINT personal_documentos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal_empleados
    ADD CONSTRAINT personal_empleados_curp_key UNIQUE (curp);

ALTER TABLE ONLY public.personal_empleados
    ADD CONSTRAINT personal_empleados_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal_empleados
    ADD CONSTRAINT personal_empleados_rfc_key UNIQUE (rfc);

ALTER TABLE ONLY public.personal_pagos
    ADD CONSTRAINT personal_pagos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal_semanas_pago
    ADD CONSTRAINT personal_semanas_pago_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal_semanas_pago
    ADD CONSTRAINT personal_semanas_pago_semana_anio_key UNIQUE (semana, anio);

ALTER TABLE ONLY public.personal_tipos_documento
    ADD CONSTRAINT personal_tipos_documento_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.personal_tipos_documento
    ADD CONSTRAINT personal_tipos_documento_pkey PRIMARY KEY (id);

CREATE INDEX idx_checadas_empleado ON public.personal_checadas USING btree (empleado_id);

CREATE INDEX idx_checadas_timestamp ON public.personal_checadas USING btree ("timestamp");

ALTER TABLE ONLY public.personal_checadas
    ADD CONSTRAINT personal_checadas_dispositivo_id_fkey FOREIGN KEY (dispositivo_id) REFERENCES public.personal_checadores(id);

ALTER TABLE ONLY public.personal_checadas
    ADD CONSTRAINT personal_checadas_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.personal_empleados(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.personal_checador_empleados
    ADD CONSTRAINT personal_checador_empleados_dispositivo_id_fkey FOREIGN KEY (dispositivo_id) REFERENCES public.personal_checadores(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.personal_checador_empleados
    ADD CONSTRAINT personal_checador_empleados_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.personal_empleados(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.personal_documentos
    ADD CONSTRAINT personal_documentos_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.personal_empleados(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.personal_documentos
    ADD CONSTRAINT personal_documentos_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.personal_tipos_documento(id);

ALTER TABLE ONLY public.personal_pagos
    ADD CONSTRAINT personal_pagos_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.personal_empleados(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.personal_pagos
    ADD CONSTRAINT personal_pagos_semana_pago_id_fkey FOREIGN KEY (semana_pago_id) REFERENCES public.personal_semanas_pago(id) ON DELETE CASCADE;

INSERT INTO public.personal_tipos_documento VALUES (1, 'Contrato de trabajo', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (2, 'Solicitud de empleo con fotografía', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (3, 'Copia de acta de nacimiento', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (4, 'Copia de identificación', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (5, 'Copia de comprobante de domicilio (menor a 90 días de la contratación)', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (6, 'Número de seguridad social', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (7, 'Constancia de RFC reciente', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (8, 'Certificado médico (sin enfermedad contagiosa ni padecimientos de columna)', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (9, 'Comprobante de estudios', false, NULL);
INSERT INTO public.personal_tipos_documento VALUES (10, 'Tarjeta de nómina BBVA', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (11, 'Convenio de horario', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (12, 'Convenio de pago electrónico', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (13, 'Resguardos por parte de la empresa', false, NULL);
INSERT INTO public.personal_tipos_documento VALUES (14, 'Aviso de privacidad', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (15, 'Adhesión al sindicato', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (16, 'Reglamento interior', true, NULL);
INSERT INTO public.personal_tipos_documento VALUES (17, 'Aviso de crédito al Infonavit', false, NULL);
SELECT pg_catalog.setval('public.personal_tipos_documento_id_seq', 17, true);
