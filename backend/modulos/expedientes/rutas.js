// Rutas del expediente digital, montadas en /api/expedientes.
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../../src/db/pool');

const DIR = path.join(__dirname, '..', '..', 'uploads', 'expedientes');
fs.mkdirSync(DIR, { recursive: true });
const EXTENSIONES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.txt'];
const upload = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  fileFilter: (req, file, cb) => cb(null, EXTENSIONES.includes(path.extname(file.originalname).toLowerCase())),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const fallo = (res, status, error) => res.status(status).json({ error });
const texto = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);
// multer entrega el nombre original en latin1
const nombreOriginal = (f) => Buffer.from(f.originalname, 'latin1').toString('utf8');

// q busca en número, título, cliente, materia y nombres de documentos
router.get('/', async (req, res) => {
  const q = req.query.q?.trim();
  const { rows } = await pool.query(
    `SELECT e.*, (SELECT COUNT(*)::int FROM expedientes_documentos d WHERE d.expediente_id = e.id) AS documentos
     FROM expedientes_expedientes e
     WHERE ($1::text IS NULL OR e.numero ILIKE $2 OR e.titulo ILIKE $2 OR e.cliente ILIKE $2 OR e.materia ILIKE $2
            OR EXISTS (SELECT 1 FROM expedientes_documentos d WHERE d.expediente_id = e.id AND d.nombre ILIKE $2))
       AND ($3::text IS NULL OR e.estado = $3)
     ORDER BY e.created_at DESC`,
    [q || null, `%${q}%`, req.query.estado || null]);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows: [e] } = await pool.query('SELECT * FROM expedientes_expedientes WHERE id = $1', [req.params.id]);
  if (!e) return fallo(res, 404, 'Expediente no encontrado');
  const { rows: docs } = await pool.query(
    'SELECT id, nombre, tamano, subido_por, created_at FROM expedientes_documentos WHERE expediente_id = $1 ORDER BY created_at DESC', [e.id]);
  res.json({ ...e, docs });
});

function datos(b) {
  if (!b.numero?.trim() || !b.titulo?.trim()) return [null, 'Número y título son requeridos'];
  if (b.estado !== undefined && !['abierto', 'cerrado'].includes(b.estado)) return [null, 'Estado inválido'];
  return [[b.numero.trim(), b.titulo.trim(), texto(b.cliente), texto(b.materia), b.estado || 'abierto', texto(b.notas)]];
}
const duplicado = (res, e) => { if (e.code === '23505') return fallo(res, 409, 'Ya existe un expediente con ese número'); throw e; };

router.post('/', async (req, res) => {
  const [d, error] = datos(req.body);
  if (error) return fallo(res, 400, error);
  try {
    const { rows: [nuevo] } = await pool.query(
      `INSERT INTO expedientes_expedientes (numero, titulo, cliente, materia, estado, notas)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, d);
    res.status(201).json(nuevo);
  } catch (e) { duplicado(res, e); }
});

router.put('/:id', async (req, res) => {
  const [d, error] = datos(req.body);
  if (error) return fallo(res, 400, error);
  try {
    const { rows: [act] } = await pool.query(
      `UPDATE expedientes_expedientes SET numero = $1, titulo = $2, cliente = $3, materia = $4, estado = $5, notas = $6
       WHERE id = $7 RETURNING *`, [...d, req.params.id]);
    if (!act) return fallo(res, 404, 'Expediente no encontrado');
    res.json(act);
  } catch (e) { duplicado(res, e); }
});

// ───────────── Documentos ─────────────

router.post('/:id/documentos', upload.single('archivo'), async (req, res) => {
  if (!req.file) return fallo(res, 400, `Archivo requerido (${EXTENSIONES.join(', ')}; máx. 25 MB)`);
  const { rows: [e] } = await pool.query('SELECT id FROM expedientes_expedientes WHERE id = $1', [req.params.id]);
  if (!e) { fs.unlinkSync(req.file.path); return fallo(res, 404, 'Expediente no encontrado'); }
  const { rows: [doc] } = await pool.query(
    `INSERT INTO expedientes_documentos (expediente_id, nombre, ruta, tamano, subido_por)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, tamano, subido_por, created_at`,
    [e.id, nombreOriginal(req.file), req.file.filename, req.file.size, req.user.nombre]);
  res.status(201).json(doc);
});

router.get('/documentos/:id/descargar', async (req, res) => {
  const { rows: [doc] } = await pool.query('SELECT * FROM expedientes_documentos WHERE id = $1', [req.params.id]);
  const ruta = doc && path.join(DIR, path.basename(doc.ruta));
  if (!doc || !fs.existsSync(ruta)) return fallo(res, 404, 'Documento no encontrado');
  res.download(ruta, doc.nombre);
});

router.delete('/documentos/:id', async (req, res) => {
  const { rows: [doc] } = await pool.query('DELETE FROM expedientes_documentos WHERE id = $1 RETURNING ruta', [req.params.id]);
  if (!doc) return fallo(res, 404, 'Documento no encontrado');
  fs.rmSync(path.join(DIR, path.basename(doc.ruta)), { force: true });
  res.status(204).end();
});

module.exports = router;
