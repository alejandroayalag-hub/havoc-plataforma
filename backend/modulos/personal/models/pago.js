const pool = require('../../../src/db/pool');

const PagoModel = {
  async crearSemana({ semana, anio, filename, ruta, total_registros }) {
    const { rows } = await pool.query(
      `INSERT INTO personal_semanas_pago (semana, anio, filename, ruta, total_registros)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [semana, anio, filename, ruta, total_registros]
    );
    return rows[0];
  },

  async findSemanas() {
    const { rows } = await pool.query(
      `SELECT * FROM personal_semanas_pago ORDER BY anio DESC, semana DESC`
    );
    return rows;
  },

  async findSemanaById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM personal_semanas_pago WHERE id = $1`, [id]
    );
    return rows[0] || null;
  },

  async semanaExiste(semana, anio) {
    const { rows } = await pool.query(
      `SELECT id FROM personal_semanas_pago WHERE semana = $1 AND anio = $2`,
      [semana, anio]
    );
    return rows[0] || null;
  },

  async insertarPagos(registros) {
    if (!registros.length) return [];
    const values = registros.map((r, i) => {
      const base = i * 6;
      return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6})`;
    }).join(', ');
    const params = registros.flatMap(r => [
      r.semana_pago_id, r.empleado_id || null,
      r.nombre_pdf, r.cuenta || null,
      r.monto || null, r.autorizado || null
    ]);
    const { rows } = await pool.query(
      `INSERT INTO personal_pagos (semana_pago_id, empleado_id, nombre_pdf, cuenta, monto, autorizado)
       VALUES ${values} RETURNING *`,
      params
    );
    return rows;
  },

  async findByEmpleado(empleadoId) {
    const { rows } = await pool.query(
      `SELECT p.*, sp.semana, sp.anio, sp.filename AS pdf_filename
       FROM personal_pagos p
       JOIN personal_semanas_pago sp ON sp.id = p.semana_pago_id
       WHERE p.empleado_id = $1
       ORDER BY sp.anio DESC, sp.semana DESC`,
      [empleadoId]
    );
    return rows;
  },

  async findBySemana(semanaId) {
    const { rows } = await pool.query(
      `SELECT p.*, e.nombre, e.apellido_paterno, e.apellido_materno
       FROM personal_pagos p
       LEFT JOIN personal_empleados e ON e.id = p.empleado_id
       WHERE p.semana_pago_id = $1
       ORDER BY p.nombre_pdf`,
      [semanaId]
    );
    return rows;
  },

  async deleteSemana(id) {
    const { rows } = await pool.query(
      `DELETE FROM personal_semanas_pago WHERE id = $1 RETURNING *`, [id]
    );
    return rows[0] || null;
  },
};

module.exports = PagoModel;
