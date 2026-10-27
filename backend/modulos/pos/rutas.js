// Rutas del POS, montadas en /api/pos. El acceso al módulo ya lo validó requireModulo;
// aquí solo se distingue admin (precios, costos, inventario, reportes) de cajero.
const router = require('express').Router();
const pool = require('../../src/db/pool');
const { requireRol } = require('../../src/middleware/roles');

const soloAdmin = requireRol('admin');
const esAdmin = (req) => req.user.rol === 'admin';
const METODOS = ['efectivo', 'tarjeta', 'transferencia'];
const UNIDADES = ['pza', 'kg', 'lt', 'm'];
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
const fallo = (res, status, error) => res.status(status).json({ error });
// ponytail: zona horaria fija de México; variable de entorno si algún cliente queda fuera
const TZ = 'America/Mexico_City';
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

// Ventas pagadas de una caja, por método
const TOTALES_CAJA = `
  SELECT COUNT(*)::int AS num_ventas,
         COALESCE(SUM(total), 0) AS total_ventas,
         COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'efectivo'), 0) AS ventas_efectivo,
         COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'tarjeta'), 0) AS ventas_tarjeta,
         COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'transferencia'), 0) AS ventas_transferencia
  FROM pos_ventas WHERE caja_id = $1 AND estado = 'pagada'`;

const cajaAbierta = async (usuarioId) =>
  (await pool.query(`SELECT * FROM pos_cajas WHERE usuario_id = $1 AND estado = 'abierta'`, [usuarioId])).rows[0];

// ───────────── Productos ─────────────

const CAMPOS_PRODUCTO = ['nombre', 'codigo_barras', 'categoria', 'unidad', 'precio_costo', 'precio_venta',
                         'stock_minimo', 'proveedor_id', 'activo'];

function validarProducto(b, nuevo) {
  if (nuevo && !b.nombre?.trim()) return 'Nombre requerido';
  if (b.nombre !== undefined && !b.nombre?.trim()) return 'Nombre requerido';
  if ((nuevo || b.precio_venta !== undefined) && !(num(b.precio_venta) > 0)) return 'Precio de venta requerido';
  if (b.precio_costo !== undefined && b.precio_costo !== '' && !(num(b.precio_costo) >= 0)) return 'Costo inválido';
  if (b.stock !== undefined && b.stock !== '' && !(num(b.stock) >= 0)) return 'Existencia inválida';
  if (b.stock_minimo !== undefined && b.stock_minimo !== '' && !(num(b.stock_minimo) >= 0)) return 'Mínimo inválido';
  if (b.unidad !== undefined && !UNIDADES.includes(b.unidad)) return 'Unidad inválida';
  return null;
}
const limpiarProducto = (k, v) =>
  ['codigo_barras', 'categoria'].includes(k) ? (v?.trim() || null)
  : k === 'proveedor_id' ? (v || null)
  : ['precio_costo', 'stock_minimo'].includes(k) ? (v === '' ? 0 : v)
  : typeof v === 'string' ? v.trim() : v;

// q busca por nombre o código exacto; el cajero no ve costos
router.get('/productos', async (req, res) => {
  const where = [req.query.todos && esAdmin(req) ? 'true' : 'p.activo'];
  const values = [];
  if (req.query.q) {
    values.push(`%${req.query.q.trim()}%`, req.query.q.trim());
    where.push(`(p.nombre ILIKE $1 OR p.codigo_barras = $2 OR p.categoria ILIKE $1)`);
  }
  if (req.query.stock_bajo) where.push('p.stock <= p.stock_minimo');
  const { rows } = await pool.query(
    `SELECT p.*, pr.nombre AS proveedor FROM pos_productos p
     LEFT JOIN pos_proveedores pr ON pr.id = p.proveedor_id
     WHERE ${where.join(' AND ')} ORDER BY p.nombre LIMIT 500`, values);
  res.json(esAdmin(req) ? rows : rows.map(({ precio_costo, ...p }) => p));
});

router.post('/productos', soloAdmin, async (req, res) => {
  const error = validarProducto(req.body, true);
  if (error) return fallo(res, 400, error);
  const campos = CAMPOS_PRODUCTO.filter(k => req.body[k] !== undefined);
  const stock = num(req.body.stock) || 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO pos_productos (${[...campos, 'stock'].join(', ')})
       VALUES (${[...campos, 'stock'].map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      [...campos.map(k => limpiarProducto(k, req.body[k])), stock]);
    if (stock > 0) {
      await client.query(
        `INSERT INTO pos_movimientos (producto_id, tipo, cantidad, costo_unitario, nota, usuario_id)
         VALUES ($1, 'entrada', $2, $3, 'Existencia inicial', $4)`,
        [rows[0].id, stock, rows[0].precio_costo, req.user.id]);
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return fallo(res, 409, 'Ese código de barras ya es de otro producto');
    throw e;
  } finally {
    client.release();
  }
});

// La existencia no se edita aquí: se mueve con entradas y ajustes para que quede en la bitácora
router.put('/productos/:id', soloAdmin, async (req, res) => {
  const error = validarProducto(req.body, false);
  if (error) return fallo(res, 400, error);
  const campos = CAMPOS_PRODUCTO.filter(k => req.body[k] !== undefined);
  if (!campos.length) return fallo(res, 400, 'Nada que actualizar');
  try {
    const { rows } = await pool.query(
      `UPDATE pos_productos SET ${campos.map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = NOW()
       WHERE id = $${campos.length + 1} RETURNING *`,
      [...campos.map(k => limpiarProducto(k, req.body[k])), req.params.id]);
    if (!rows[0]) return fallo(res, 404, 'Producto no encontrado');
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return fallo(res, 409, 'Ese código de barras ya es de otro producto');
    throw e;
  }
});

// Entrada de mercancía: suma existencia y, si viene costo, actualiza el costo del producto
router.post('/productos/:id/entrada', soloAdmin, async (req, res) => {
  const cantidad = num(req.body.cantidad);
  const costo = req.body.costo_unitario === '' || req.body.costo_unitario === undefined ? null : num(req.body.costo_unitario);
  if (!(cantidad > 0)) return fallo(res, 400, 'Cantidad inválida');
  if (costo !== null && !(costo >= 0)) return fallo(res, 400, 'Costo inválido');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE pos_productos SET stock = stock + $1, precio_costo = COALESCE($2, precio_costo), updated_at = NOW()
       WHERE id = $3 RETURNING *`, [cantidad, costo, req.params.id]);
    if (!rows[0]) { await client.query('ROLLBACK'); return fallo(res, 404, 'Producto no encontrado'); }
    await client.query(
      `INSERT INTO pos_movimientos (producto_id, tipo, cantidad, costo_unitario, nota, usuario_id)
       VALUES ($1, 'entrada', $2, $3, $4, $5)`,
      [req.params.id, cantidad, costo, req.body.nota || null, req.user.id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// Ajuste por conteo físico: fija la existencia y registra la diferencia
router.post('/productos/:id/ajuste', soloAdmin, async (req, res) => {
  const stock = num(req.body.stock);
  if (!(stock >= 0)) return fallo(res, 400, 'Existencia inválida');
  if (!req.body.nota?.trim()) return fallo(res, 400, 'Anota el motivo del ajuste');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [antes] } = await client.query('SELECT stock FROM pos_productos WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!antes) { await client.query('ROLLBACK'); return fallo(res, 404, 'Producto no encontrado'); }
    const { rows } = await client.query(
      'UPDATE pos_productos SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [stock, req.params.id]);
    await client.query(
      `INSERT INTO pos_movimientos (producto_id, tipo, cantidad, nota, usuario_id) VALUES ($1, 'ajuste', $2, $3, $4)`,
      [req.params.id, stock - Number(antes.stock), req.body.nota.trim(), req.user.id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

router.get('/productos/:id/movimientos', soloAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*, u.nombre AS usuario FROM pos_movimientos m LEFT JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.producto_id = $1 ORDER BY m.fecha DESC LIMIT 100`, [req.params.id]);
  res.json(rows);
});

// ───────────── Proveedores ─────────────

const CAMPOS_PROVEEDOR = ['nombre', 'contacto', 'telefono', 'email', 'activo'];

router.get('/proveedores', soloAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM pos_proveedores ORDER BY activo DESC, nombre');
  res.json(rows);
});

router.post('/proveedores', soloAdmin, async (req, res) => {
  if (!req.body.nombre?.trim()) return fallo(res, 400, 'Nombre requerido');
  const campos = CAMPOS_PROVEEDOR.filter(k => req.body[k] !== undefined);
  const { rows } = await pool.query(
    `INSERT INTO pos_proveedores (${campos.join(', ')}) VALUES (${campos.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    campos.map(k => req.body[k]));
  res.status(201).json(rows[0]);
});

router.put('/proveedores/:id', soloAdmin, async (req, res) => {
  if (req.body.nombre !== undefined && !req.body.nombre?.trim()) return fallo(res, 400, 'Nombre requerido');
  const campos = CAMPOS_PROVEEDOR.filter(k => req.body[k] !== undefined);
  if (!campos.length) return fallo(res, 400, 'Nada que actualizar');
  const { rows } = await pool.query(
    `UPDATE pos_proveedores SET ${campos.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${campos.length + 1} RETURNING *`,
    [...campos.map(k => req.body[k]), req.params.id]);
  if (!rows[0]) return fallo(res, 404, 'Proveedor no encontrado');
  res.json(rows[0]);
});

// ───────────── Clientes (opcional en la venta) ─────────────

router.get('/clientes', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const { rows } = await pool.query(
    'SELECT * FROM pos_clientes WHERE nombre ILIKE $1 OR telefono ILIKE $1 ORDER BY nombre LIMIT 10', [`%${q}%`]);
  res.json(rows);
});

router.post('/clientes', async (req, res) => {
  if (!req.body.nombre?.trim()) return fallo(res, 400, 'Nombre requerido');
  const { rows } = await pool.query(
    'INSERT INTO pos_clientes (nombre, telefono) VALUES ($1, $2) RETURNING *',
    [req.body.nombre.trim(), req.body.telefono?.trim() || null]);
  res.status(201).json(rows[0]);
});

// ───────────── Caja ─────────────

// Mi caja abierta con sus totales (null si no tengo)
router.get('/caja', async (req, res) => {
  const caja = await cajaAbierta(req.user.id);
  if (!caja) return res.json(null);
  const { rows } = await pool.query(TOTALES_CAJA, [caja.id]);
  res.json({ ...caja, ...rows[0] });
});

router.post('/caja/abrir', async (req, res) => {
  const inicial = num(req.body.efectivo_inicial);
  if (!(inicial >= 0)) return fallo(res, 400, 'Efectivo inicial requerido');
  try {
    const { rows } = await pool.query(
      'INSERT INTO pos_cajas (usuario_id, efectivo_inicial) VALUES ($1, $2) RETURNING *', [req.user.id, inicial]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return fallo(res, 409, 'Ya tienes una caja abierta');
    throw e;
  }
});

// Corte: esperado = inicial + ventas en efectivo; diferencia = contado − esperado
router.post('/caja/cerrar', async (req, res) => {
  const contado = num(req.body.efectivo_final);
  if (!(contado >= 0)) return fallo(res, 400, 'Efectivo contado requerido');
  const caja = await cajaAbierta(req.user.id);
  if (!caja) return fallo(res, 400, 'No tienes caja abierta');
  const { rows: [t] } = await pool.query(TOTALES_CAJA, [caja.id]);
  const esperado = Number(caja.efectivo_inicial) + Number(t.ventas_efectivo);
  const { rows } = await pool.query(
    `UPDATE pos_cajas SET estado = 'cerrada', cerrada_en = NOW(), efectivo_final = $1, efectivo_esperado = $2,
            diferencia = $3 WHERE id = $4 AND estado = 'abierta' RETURNING *`,
    [contado, esperado, Math.round((contado - esperado) * 100) / 100, caja.id]);
  if (!rows[0]) return fallo(res, 409, 'La caja ya estaba cerrada');
  res.json({ ...rows[0], ...t });
});

// Historial de cortes: admin ve todos, cajero los suyos
router.get('/cajas', async (req, res) => {
  const values = [];
  let where = 'true';
  if (!esAdmin(req)) { values.push(req.user.id); where = 'c.usuario_id = $1'; }
  const { rows } = await pool.query(
    `SELECT c.*, u.nombre AS usuario, t.* FROM pos_cajas c
     JOIN usuarios u ON u.id = c.usuario_id
     CROSS JOIN LATERAL (${TOTALES_CAJA.replace('$1', 'c.id')}) t
     WHERE ${where} ORDER BY c.abierta_en DESC LIMIT 100`, values);
  res.json(rows);
});

// ───────────── Ventas ─────────────

// Cobro en una sola transacción: venta + renglones + descuento de existencia, o nada
router.post('/ventas', async (req, res) => {
  const { items, metodo_pago, cliente_id } = req.body;
  if (!METODOS.includes(metodo_pago)) return fallo(res, 400, 'Método de pago inválido');
  if (!Array.isArray(items) || !items.length) return fallo(res, 400, 'Carrito vacío');

  // Junta renglones repetidos del mismo producto
  const cantidades = new Map();
  for (const it of items) {
    const cantidad = num(it.cantidad);
    if (!(cantidad > 0)) return fallo(res, 400, 'Cantidad inválida');
    const id = Number(it.producto_id);
    cantidades.set(id, Math.round(((cantidades.get(id) || 0) + cantidad) * 1000) / 1000);
  }

  const caja = await cajaAbierta(req.user.id);
  if (!caja) return fallo(res, 400, 'Abre tu caja antes de vender');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE: dos cajas no pueden vender la misma última pieza
    const { rows: productos } = await client.query(
      'SELECT * FROM pos_productos WHERE id = ANY($1::int[]) AND activo ORDER BY id FOR UPDATE', [[...cantidades.keys()]]);
    if (productos.length !== cantidades.size) throw Object.assign(new Error('Producto no encontrado o inactivo'), { status: 400 });

    let total = 0;
    for (const p of productos) {
      const cantidad = cantidades.get(p.id);
      if (p.unidad === 'pza' && !Number.isInteger(cantidad)) throw Object.assign(new Error(`"${p.nombre}" se vende por pieza`), { status: 400 });
      if (Number(p.stock) < cantidad) throw Object.assign(new Error(`No alcanza "${p.nombre}" (hay ${Number(p.stock)})`), { status: 400 });
      total += Math.round(cantidad * Number(p.precio_venta) * 100) / 100;
    }
    total = Math.round(total * 100) / 100;

    const recibido = metodo_pago === 'efectivo' && req.body.recibido !== '' && req.body.recibido != null ? num(req.body.recibido) : null;
    if (recibido !== null && !(recibido >= total)) throw Object.assign(new Error('El efectivo recibido no cubre el total'), { status: 400 });

    const { rows: [venta] } = await client.query(
      `INSERT INTO pos_ventas (caja_id, usuario_id, cliente_id, total, metodo_pago, recibido)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [caja.id, req.user.id, cliente_id || null, total, metodo_pago, recibido]);
    for (const p of productos) {
      const cantidad = cantidades.get(p.id);
      await client.query(
        `INSERT INTO pos_venta_items (venta_id, producto_id, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [venta.id, p.id, p.nombre, cantidad, p.precio_venta, p.precio_costo, Math.round(cantidad * Number(p.precio_venta) * 100) / 100]);
      await client.query('UPDATE pos_productos SET stock = stock - $1 WHERE id = $2', [cantidad, p.id]);
    }
    if (venta.cliente_id) await client.query('UPDATE pos_clientes SET ultima_compra = NOW() WHERE id = $1', [venta.cliente_id]);
    await client.query('COMMIT');
    res.status(201).json(venta);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23503') return fallo(res, 400, 'Cliente no encontrado');
    throw e;
  } finally {
    client.release();
  }
});

// Admin: por rango de fechas. Cajero: las de su caja abierta.
router.get('/ventas', async (req, res) => {
  const values = [];
  let where;
  if (esAdmin(req)) {
    values.push(req.query.desde || hoy(), req.query.hasta || hoy());
    where = `(v.fecha AT TIME ZONE '${TZ}')::date BETWEEN $1 AND $2`;
  } else {
    const caja = await cajaAbierta(req.user.id);
    if (!caja) return res.json([]);
    values.push(caja.id);
    where = 'v.caja_id = $1';
  }
  const { rows } = await pool.query(
    `SELECT v.*, u.nombre AS vendedor, c.nombre AS cliente FROM pos_ventas v
     JOIN usuarios u ON u.id = v.usuario_id LEFT JOIN pos_clientes c ON c.id = v.cliente_id
     WHERE ${where} ORDER BY v.fecha DESC LIMIT 1000`, values);
  res.json(rows);
});

router.get('/ventas/:id', async (req, res) => {
  const { rows: [venta] } = await pool.query(
    `SELECT v.*, u.nombre AS vendedor, c.nombre AS cliente FROM pos_ventas v
     JOIN usuarios u ON u.id = v.usuario_id LEFT JOIN pos_clientes c ON c.id = v.cliente_id WHERE v.id = $1`, [req.params.id]);
  if (!venta) return fallo(res, 404, 'Venta no encontrada');
  if (!esAdmin(req) && venta.usuario_id !== req.user.id) return fallo(res, 403, 'Sin permisos');
  const { rows: items } = await pool.query(
    `SELECT i.*, p.unidad FROM pos_venta_items i JOIN pos_productos p ON p.id = i.producto_id
     WHERE i.venta_id = $1 ORDER BY i.id`, [venta.id]);
  res.json({ ...venta, items });
});

// Cancela y regresa existencia. Cajero: solo ventas de su caja abierta.
router.post('/ventas/:id/cancelar', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [venta] } = await client.query('SELECT * FROM pos_ventas WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!venta) throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
    if (venta.estado !== 'pagada') throw Object.assign(new Error('La venta ya estaba cancelada'), { status: 409 });
    if (!esAdmin(req)) {
      const caja = await cajaAbierta(req.user.id);
      if (!caja || caja.id !== venta.caja_id) throw Object.assign(new Error('Solo puedes cancelar ventas de tu caja abierta'), { status: 403 });
    }
    await client.query(
      `UPDATE pos_productos p SET stock = p.stock + i.cantidad
       FROM pos_venta_items i WHERE i.venta_id = $1 AND i.producto_id = p.id`, [venta.id]);
    const { rows } = await client.query(
      `UPDATE pos_ventas SET estado = 'cancelada', cancelada_por = $2, cancelada_en = NOW() WHERE id = $1 RETURNING *`,
      [venta.id, req.user.id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// ───────────── Reportes ─────────────

// Todo el tablero en una llamada; ganancia con el costo guardado al momento de vender
router.get('/reportes', soloAdmin, async (req, res) => {
  const rango = [req.query.desde || hoy(), req.query.hasta || hoy()];
  const enRango = `v.estado = 'pagada' AND (v.fecha AT TIME ZONE '${TZ}')::date BETWEEN $1 AND $2`;
  const [resumen, metodos, top, vendedores, stockBajo] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT v.id)::int AS num_ventas, COALESCE(SUM(i.subtotal), 0) AS ingresos,
              COALESCE(SUM(i.cantidad * i.costo_unitario), 0) AS costo
       FROM pos_ventas v JOIN pos_venta_items i ON i.venta_id = v.id WHERE ${enRango}`, rango),
    pool.query(
      `SELECT v.metodo_pago, COUNT(*)::int AS num_ventas, SUM(v.total) AS total
       FROM pos_ventas v WHERE ${enRango} GROUP BY v.metodo_pago ORDER BY total DESC`, rango),
    pool.query(
      `SELECT i.producto_id, i.nombre, p.unidad, SUM(i.cantidad) AS cantidad, SUM(i.subtotal) AS ingresos,
              SUM(i.subtotal - i.cantidad * i.costo_unitario) AS ganancia
       FROM pos_ventas v JOIN pos_venta_items i ON i.venta_id = v.id JOIN pos_productos p ON p.id = i.producto_id
       WHERE ${enRango} GROUP BY i.producto_id, i.nombre, p.unidad ORDER BY ingresos DESC LIMIT 10`, rango),
    pool.query(
      `SELECT u.nombre, COUNT(*)::int AS num_ventas, SUM(v.total) AS total
       FROM pos_ventas v JOIN usuarios u ON u.id = v.usuario_id WHERE ${enRango} GROUP BY u.nombre ORDER BY total DESC`, rango),
    pool.query('SELECT id, nombre, unidad, stock, stock_minimo FROM pos_productos WHERE activo AND stock <= stock_minimo ORDER BY stock'),
  ]);
  const r = resumen.rows[0];
  const ingresos = Number(r.ingresos), costo = Number(r.costo);
  res.json({
    desde: rango[0], hasta: rango[1],
    resumen: {
      num_ventas: r.num_ventas, ingresos, costo, ganancia: Math.round((ingresos - costo) * 100) / 100,
      margen: ingresos > 0 ? Math.round(((ingresos - costo) / ingresos) * 1000) / 10 : 0,
    },
    por_metodo: metodos.rows, top_productos: top.rows, por_vendedor: vendedores.rows, stock_bajo: stockBajo.rows,
  });
});

module.exports = router;
