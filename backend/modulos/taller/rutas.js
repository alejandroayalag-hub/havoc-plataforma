// Rutas de la bitácora, montadas en /api/taller.
const router = require('express').Router();
const pool = require('../../src/db/pool');

const ESTADOS = ['recibido', 'en_proceso', 'entregado'];
const fallo = (res, status, error) => res.status(status).json({ error });
const texto = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

// ───────────── Vehículos ─────────────

// q busca por placas, marca, modelo o propietario; trae el último servicio de cada uno
router.get('/vehiculos', async (req, res) => {
  const q = req.query.q?.trim();
  const { rows } = await pool.query(
    `SELECT v.*, s.fecha AS ultimo_servicio, s.estado AS ultimo_estado
     FROM taller_vehiculos v
     LEFT JOIN LATERAL (SELECT fecha, estado FROM taller_servicios WHERE vehiculo_id = v.id
                        ORDER BY fecha DESC, id DESC LIMIT 1) s ON true
     WHERE $1::text IS NULL OR v.placas ILIKE $2 OR v.marca ILIKE $2 OR v.modelo ILIKE $2 OR v.propietario ILIKE $2
     ORDER BY s.fecha DESC NULLS LAST, v.placas`,
    [q || null, `%${q}%`]);
  res.json(rows);
});

router.get('/vehiculos/:id', async (req, res) => {
  const { rows: [v] } = await pool.query('SELECT * FROM taller_vehiculos WHERE id = $1', [req.params.id]);
  if (!v) return fallo(res, 404, 'Vehículo no encontrado');
  const { rows: servicios } = await pool.query(
    'SELECT * FROM taller_servicios WHERE vehiculo_id = $1 ORDER BY fecha DESC, id DESC', [v.id]);
  res.json({ ...v, servicios });
});

function datosVehiculo(b) {
  if (!b.placas?.trim() || !b.marca?.trim() || !b.modelo?.trim() || !b.propietario?.trim())
    return [null, 'Placas, marca, modelo y propietario son requeridos'];
  const anio = b.anio ? Number(b.anio) : null;
  if (anio !== null && !(anio >= 1950 && anio <= 2100)) return [null, 'Año inválido'];
  return [[b.placas.trim().toUpperCase(), b.marca.trim(), b.modelo.trim(), anio, texto(b.color), b.propietario.trim(), texto(b.telefono)]];
}

router.post('/vehiculos', async (req, res) => {
  const [v, error] = datosVehiculo(req.body);
  if (error) return fallo(res, 400, error);
  try {
    const { rows: [nuevo] } = await pool.query(
      `INSERT INTO taller_vehiculos (placas, marca, modelo, anio, color, propietario, telefono)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, v);
    res.status(201).json(nuevo);
  } catch (e) {
    if (e.code === '23505') return fallo(res, 409, 'Ya existe un vehículo con esas placas');
    throw e;
  }
});

router.put('/vehiculos/:id', async (req, res) => {
  const [v, error] = datosVehiculo(req.body);
  if (error) return fallo(res, 400, error);
  try {
    const { rows: [act] } = await pool.query(
      `UPDATE taller_vehiculos SET placas = $1, marca = $2, modelo = $3, anio = $4, color = $5, propietario = $6, telefono = $7
       WHERE id = $8 RETURNING *`, [...v, req.params.id]);
    if (!act) return fallo(res, 404, 'Vehículo no encontrado');
    res.json(act);
  } catch (e) {
    if (e.code === '23505') return fallo(res, 409, 'Ya existe un vehículo con esas placas');
    throw e;
  }
});

// ───────────── Servicios ─────────────

function datosServicio(b) {
  if (!b.motivo?.trim()) return [null, 'Motivo requerido'];
  if (b.estado !== undefined && !ESTADOS.includes(b.estado)) return [null, 'Estado inválido'];
  const km = b.kilometraje === '' || b.kilometraje == null ? null : Number(b.kilometraje);
  if (km !== null && !(km >= 0)) return [null, 'Kilometraje inválido'];
  const costo = b.costo === '' || b.costo == null ? 0 : Number(b.costo);
  if (!(costo >= 0)) return [null, 'Costo inválido'];
  return [[b.fecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }), km, b.motivo.trim(), texto(b.trabajos), costo, b.estado || 'recibido']];
}

router.post('/vehiculos/:id/servicios', async (req, res) => {
  const [s, error] = datosServicio(req.body);
  if (error) return fallo(res, 400, error);
  const { rows: [v] } = await pool.query('SELECT id FROM taller_vehiculos WHERE id = $1', [req.params.id]);
  if (!v) return fallo(res, 404, 'Vehículo no encontrado');
  const { rows: [nuevo] } = await pool.query(
    `INSERT INTO taller_servicios (vehiculo_id, fecha, kilometraje, motivo, trabajos, costo, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [v.id, ...s]);
  res.status(201).json(nuevo);
});

router.put('/servicios/:id', async (req, res) => {
  const [s, error] = datosServicio(req.body);
  if (error) return fallo(res, 400, error);
  const { rows: [act] } = await pool.query(
    `UPDATE taller_servicios SET fecha = $1, kilometraje = $2, motivo = $3, trabajos = $4, costo = $5, estado = $6
     WHERE id = $7 RETURNING *`, [...s, req.params.id]);
  if (!act) return fallo(res, 404, 'Servicio no encontrado');
  res.json(act);
});

module.exports = router;
