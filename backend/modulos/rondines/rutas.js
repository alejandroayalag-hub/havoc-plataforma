// Rutas de rondines, montadas en /api/rondines. El guardia solo registra; puntos y bitácora completa son del admin.
const router = require('express').Router();
const pool = require('../../src/db/pool');
const { requireRol } = require('../../src/middleware/roles');

const soloAdmin = requireRol('admin');
const fallo = (res, status, error) => res.status(status).json({ error });
const TZ = 'America/Mexico_City';
const UUID = /^[0-9a-f-]{36}$/i;

// ───────────── Puntos ─────────────

router.get('/puntos', soloAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, (SELECT MAX(created_at) FROM rondines_registros r WHERE r.punto_id = p.id) AS ultimo_paso
     FROM rondines_puntos p ORDER BY p.activo DESC, p.nombre`);
  res.json(rows);
});

router.post('/puntos', soloAdmin, async (req, res) => {
  if (!req.body.nombre?.trim()) return fallo(res, 400, 'Nombre requerido');
  const { rows: [p] } = await pool.query(
    'INSERT INTO rondines_puntos (nombre, descripcion) VALUES ($1, $2) RETURNING *',
    [req.body.nombre.trim(), req.body.descripcion?.trim() || null]);
  res.status(201).json(p);
});

router.put('/puntos/:id', soloAdmin, async (req, res) => {
  if (!req.body.nombre?.trim()) return fallo(res, 400, 'Nombre requerido');
  const { rows: [p] } = await pool.query(
    'UPDATE rondines_puntos SET nombre = $1, descripcion = $2, activo = $3 WHERE id = $4 RETURNING *',
    [req.body.nombre.trim(), req.body.descripcion?.trim() || null, req.body.activo ?? true, req.params.id]);
  if (!p) return fallo(res, 404, 'Punto no encontrado');
  res.json(p);
});

// ───────────── Registro de paso (guardia) ─────────────

// El QR del punto lleva su código; el guardia lo abre con la cámara del celular
router.get('/punto/:codigo', async (req, res) => {
  if (!UUID.test(req.params.codigo)) return fallo(res, 404, 'Código no válido');
  const { rows: [p] } = await pool.query(
    'SELECT id, nombre, descripcion FROM rondines_puntos WHERE codigo = $1 AND activo', [req.params.codigo]);
  if (!p) return fallo(res, 404, 'Punto no encontrado o inactivo');
  res.json(p);
});

router.post('/punto/:codigo/registrar', async (req, res) => {
  if (!UUID.test(req.params.codigo)) return fallo(res, 404, 'Código no válido');
  const { rows: [p] } = await pool.query('SELECT id FROM rondines_puntos WHERE codigo = $1 AND activo', [req.params.codigo]);
  if (!p) return fallo(res, 404, 'Punto no encontrado o inactivo');
  const coord = (v, max) => (v === undefined || v === null || !(Math.abs(Number(v)) <= max) ? null : Number(v));
  const { lat, lng, precision, nota } = req.body;
  const { rows: [r] } = await pool.query(
    `INSERT INTO rondines_registros (punto_id, usuario_id, usuario_nombre, lat, lng, precision_m, nota)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [p.id, req.user.id, req.user.nombre, coord(lat, 90), coord(lng, 180),
     Number.isFinite(Number(precision)) ? Math.round(precision) : null, nota?.trim() || null]);
  res.status(201).json(r);
});

// ───────────── Bitácora ─────────────

// Registros de un día (hora de México); el guardia solo ve los suyos
router.get('/registros', async (req, res) => {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(req.query.fecha || '') ? req.query.fecha : new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const admin = req.user.rol === 'admin';
  const { rows } = await pool.query(
    `SELECT r.*, p.nombre AS punto FROM rondines_registros r JOIN rondines_puntos p ON p.id = r.punto_id
     WHERE (r.created_at AT TIME ZONE '${TZ}')::date = $1 AND ($2 OR r.usuario_id = $3)
     ORDER BY r.created_at DESC`, [dia, admin, req.user.id]);
  res.json(rows);
});

module.exports = router;
