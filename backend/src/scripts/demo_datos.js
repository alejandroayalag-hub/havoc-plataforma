// Datos de ejemplo para instancias demo (enseñar a leads). Idempotente.
// Uso: node src/scripts/demo_datos.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const pool = require('../db/pool');
const modulos = (process.env.MODULOS || '').split(',').map(s => s.trim());

const PRODUCTOS = [
  // nombre, código, categoría, unidad, costo, precio, existencia, mínimo
  ['Coca-Cola 600 ml', '7501055300075', 'Refrescos', 'pza', 12.5, 18, 48, 12],
  ['Agua natural 1 L', '7501086801046', 'Refrescos', 'pza', 7, 12, 36, 12],
  ['Leche entera 1 L', '7501020515343', 'Lácteos', 'pza', 21, 28, 24, 6],
  ['Huevo blanco (kg)', null, 'Básicos', 'kg', 38, 48, 15, 5],
  ['Frijol negro a granel', null, 'Granos', 'kg', 28, 38, 20, 5],
  ['Arroz súper extra', null, 'Granos', 'kg', 22, 30, 25, 5],
  ['Azúcar estándar', null, 'Básicos', 'kg', 24, 32, 18, 5],
  ['Aceite vegetal 1 L', '7501039120118', 'Básicos', 'pza', 34, 45, 12, 4],
  ['Pan de caja blanco', '7441029500015', 'Panadería', 'pza', 38, 49, 8, 4],
  ['Galletas Marías', '7501000111206', 'Botanas', 'pza', 14, 20, 20, 6],
  ['Papas fritas sal 45 g', '7501011104357', 'Botanas', 'pza', 13, 19, 30, 10],
  ['Jabón de barra', '7501025403034', 'Limpieza', 'pza', 11, 16, 15, 5],
  ['Detergente en polvo 1 kg', '7501006719048', 'Limpieza', 'pza', 32, 42, 3, 4],
  ['Papel higiénico 4 rollos', '7501019006265', 'Limpieza', 'pza', 30, 39, 10, 4],
  ['Tortilla de maíz', null, 'Básicos', 'kg', 18, 24, 12, 4],
];

// PDF mínimo de una página con un texto, para documentos de ejemplo
function pdfDeEjemplo(texto) {
  const t = texto.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
  const contenido = `BT /F1 16 Tf 72 720 Td (${t}) Tj 0 -28 Td /F1 11 Tf (Documento de ejemplo - demo HAVOC) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = objs.map((o, i) => { const off = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return off; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

async function main() {
  if (modulos.includes('pos')) {
    const { rows: [prov] } = await pool.query(
      `INSERT INTO pos_proveedores (nombre, contacto, telefono)
       SELECT 'Distribuidora del Centro', 'Juan Ramírez', '4521234567'
       WHERE NOT EXISTS (SELECT 1 FROM pos_proveedores WHERE nombre = 'Distribuidora del Centro') RETURNING id`);
    for (const [nombre, codigo, categoria, unidad, costo, precio, stock, minimo] of PRODUCTOS) {
      await pool.query(
        `INSERT INTO pos_productos (nombre, codigo_barras, categoria, unidad, precio_costo, precio_venta, stock, stock_minimo, proveedor_id)
         SELECT $1::varchar, $2::varchar, $3, $4, $5, $6, $7, $8, $9 WHERE NOT EXISTS (SELECT 1 FROM pos_productos WHERE nombre = $1::varchar OR codigo_barras = $2::varchar)`,
        [nombre, codigo, categoria, unidad, costo, precio, stock, minimo, prov?.id || null]);
    }
    console.log(`✓ POS: ${PRODUCTOS.length} productos de ejemplo`);
  }
  if (modulos.includes('personal')) {
    const EMPLEADOS = [
      ['María', 'Hernández', 'Cajera', 'HERM950312MMNRRR08', 'HERM950312QX1', 'maria@ejemplo.com'],
      ['José', 'García', 'Almacén', 'GARJ880725HMNRSS02', 'GARJ880725LP3', 'jose@ejemplo.com'],
    ];
    for (const [nombre, ap, puesto, curp, rfc, email] of EMPLEADOS) {
      await pool.query(
        `INSERT INTO personal_empleados (nombre, apellido_paterno, puesto, curp, rfc, email, fecha_ingreso)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE - 90) ON CONFLICT DO NOTHING`,
        [nombre, ap, puesto, curp, rfc, email]);
    }
    console.log(`✓ Personal: ${EMPLEADOS.length} empleados de ejemplo`);
  }
  if (modulos.includes('taller')) {
    const VEHICULOS = [
      // placas, marca, modelo, año, color, propietario, teléfono, servicios [días atrás, km, motivo, trabajos, costo, estado]
      ['PZK-412-A', 'Nissan', 'Versa', 2019, 'Gris', 'Laura Méndez', '4521102030', [
        [180, 62000, 'Servicio de 60,000 km', 'Cambio de aceite y filtros, rotación de llantas', 2350, 'entregado'],
        [20, 68450, 'Ruido al frenar', 'Cambio de balatas delanteras y rectificado de discos', 1890, 'entregado'],
      ]],
      ['MNX-88-21', 'Chevrolet', 'Aveo', 2016, 'Blanco', 'Roberto Silva', '4529876543', [
        [2, 121300, 'No enciende el aire acondicionado', 'Diagnóstico: fuga en compresor', 0, 'en_proceso'],
      ]],
      ['UAB-305-C', 'Volkswagen', 'Jetta', 2021, 'Negro', 'Transportes Uruapan', '4525550101', [
        [0, 45210, 'Afinación mayor', null, 0, 'recibido'],
      ]],
    ];
    for (const [placas, marca, modelo, anio, color, propietario, telefono, servicios] of VEHICULOS) {
      const { rows: [v] } = await pool.query(
        `INSERT INTO taller_vehiculos (placas, marca, modelo, anio, color, propietario, telefono)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (placas) DO NOTHING RETURNING id`,
        [placas, marca, modelo, anio, color, propietario, telefono]);
      if (!v) continue; // ya cargado
      for (const [dias, km, motivo, trabajos, costo, estado] of servicios) {
        await pool.query(
          `INSERT INTO taller_servicios (vehiculo_id, fecha, kilometraje, motivo, trabajos, costo, estado)
           VALUES ($1, CURRENT_DATE - $2::int, $3, $4, $5, $6, $7)`, [v.id, dias, km, motivo, trabajos, costo, estado]);
      }
    }
    console.log(`✓ Bitácora: ${VEHICULOS.length} vehículos de ejemplo`);
  }
  if (modulos.includes('expedientes')) {
    const fs = require('fs');
    const crypto = require('crypto');
    const dir = path.join(__dirname, '..', '..', 'uploads', 'expedientes');
    fs.mkdirSync(dir, { recursive: true });
    const EXPEDIENTES = [
      // número, título, cliente, materia, documentos
      ['EXP-2026-014', 'Compraventa de terreno rústico', 'Familia Ortiz', 'Civil', ['Escritura antecedente.pdf', 'Identificaciones vendedores.pdf', 'Avalúo catastral.pdf']],
      ['EXP-2026-021', 'Juicio ejecutivo mercantil — pagaré', 'Ferretería El Tornillo', 'Mercantil', ['Pagaré original (copia).pdf', 'Demanda inicial.pdf']],
      ['EXP-2026-030', 'Constitución de sociedad', 'Aguacates del Valle', 'Corporativo', ['Acta constitutiva (borrador).pdf']],
    ];
    for (const [numero, titulo, cliente, materia, docs] of EXPEDIENTES) {
      const { rows: [e] } = await pool.query(
        `INSERT INTO expedientes_expedientes (numero, titulo, cliente, materia)
         VALUES ($1, $2, $3, $4) ON CONFLICT (numero) DO NOTHING RETURNING id`, [numero, titulo, cliente, materia]);
      if (!e) continue; // ya cargado
      for (const nombre of docs) {
        const archivo = `${crypto.randomUUID()}.pdf`;
        const pdf = pdfDeEjemplo(`${numero} - ${nombre.replace(/\.pdf$/, '')}`);
        fs.writeFileSync(path.join(dir, archivo), pdf);
        await pool.query(
          `INSERT INTO expedientes_documentos (expediente_id, nombre, ruta, tamano, subido_por) VALUES ($1, $2, $3, $4, 'Demo')`,
          [e.id, nombre, archivo, pdf.length]);
      }
    }
    console.log(`✓ Expedientes: ${EXPEDIENTES.length} expedientes de ejemplo`);
  }
  if (modulos.includes('rondines')) {
    const PUNTOS = [
      // nombre, descripción, lat, lng
      ['Caseta de acceso', 'Entrada principal', 19.41612, -102.05189],
      ['Bodega norte', 'Puerta trasera, junto al tablero eléctrico', 19.41671, -102.05142],
      ['Estacionamiento', 'Esquina poniente', 19.41588, -102.05236],
      ['Azotea', 'Cuarto de máquinas', 19.41630, -102.05170],
    ];
    const { rows: [{ n }] } = await pool.query('SELECT COUNT(*)::int AS n FROM rondines_puntos');
    if (!n) {
      for (const [nombre, descripcion, lat, lng] of PUNTOS) {
        const { rows: [p] } = await pool.query(
          'INSERT INTO rondines_puntos (nombre, descripcion) VALUES ($1, $2) RETURNING id', [nombre, descripcion]);
        // Tres rondas de hoy, cada 2 horas desde hace 6 h
        for (const horas of [6, 4, 2]) {
          await pool.query(
            `INSERT INTO rondines_registros (punto_id, usuario_nombre, lat, lng, precision_m, nota, created_at)
             VALUES ($1, 'Guardia Pedro Ruiz', $2, $3, 8, $4, NOW() - make_interval(hours => $5) + make_interval(mins => $6))`,
            [p.id, lat, lng, horas === 2 && nombre === 'Bodega norte' ? 'Puerta sin candado, se aseguró' : null, horas, PUNTOS.findIndex(x => x[0] === nombre) * 4]);
        }
      }
    }
    console.log(`✓ Rondines: ${PUNTOS.length} puntos de ejemplo`);
  }
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
