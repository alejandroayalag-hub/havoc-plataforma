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
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
