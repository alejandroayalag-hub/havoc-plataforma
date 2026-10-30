import { useState } from 'react';
import { input, boton, Campo, Modal, errorDe } from '../../ui';
import * as taller from './api';

export const ESTADOS = { recibido: 'Recibido', en_proceso: 'En proceso', entregado: 'Entregado' };
const COLOR = { recibido: 'bg-amber-100 text-amber-800', en_proceso: 'bg-sky-100 text-sky-800', entregado: 'bg-emerald-100 text-emerald-800' };
export const Estado = ({ e }) => <span className={`px-2 py-0.5 rounded-full text-xs ${COLOR[e]}`}>{ESTADOS[e]}</span>;
export const fecha = (v) => new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' });

export function VehiculoModal({ vehiculo, onClose }) {
  const [form, setForm] = useState({
    placas: vehiculo.placas || '', marca: vehiculo.marca || '', modelo: vehiculo.modelo || '', anio: vehiculo.anio || '',
    color: vehiculo.color || '', propietario: vehiculo.propietario || '', telefono: vehiculo.telefono || '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function guardar(e) {
    e.preventDefault();
    try {
      onClose(vehiculo.id ? await taller.editarVehiculo(vehiculo.id, form) : await taller.crearVehiculo(form));
    } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={vehiculo.id ? 'Editar vehículo' : 'Nuevo vehículo'} onClose={() => onClose(null)}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Placas *"><input className={`${input} uppercase`} required autoFocus value={form.placas} onChange={e => set('placas', e.target.value)} /></Campo>
          <Campo label="Año"><input className={input} type="number" min="1950" max="2100" value={form.anio} onChange={e => set('anio', e.target.value)} /></Campo>
          <Campo label="Marca *"><input className={input} required value={form.marca} onChange={e => set('marca', e.target.value)} /></Campo>
          <Campo label="Modelo *"><input className={input} required value={form.modelo} onChange={e => set('modelo', e.target.value)} /></Campo>
        </div>
        <Campo label="Color"><input className={input} value={form.color} onChange={e => set('color', e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Propietario *"><input className={input} required value={form.propietario} onChange={e => set('propietario', e.target.value)} /></Campo>
          <Campo label="Teléfono"><input className={input} type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></Campo>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Guardar</button>
      </form>
    </Modal>
  );
}

export function ServicioModal({ vehiculoId, servicio, onClose }) {
  const [form, setForm] = useState({
    fecha: servicio.fecha?.slice(0, 10) || new Date().toLocaleDateString('en-CA'), kilometraje: servicio.kilometraje ?? '',
    motivo: servicio.motivo || '', trabajos: servicio.trabajos || '', costo: servicio.costo ?? '', estado: servicio.estado || 'recibido',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function guardar(e) {
    e.preventDefault();
    try {
      if (servicio.id) await taller.editarServicio(servicio.id, form); else await taller.crearServicio(vehiculoId, form);
      onClose(true);
    } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={servicio.id ? 'Editar servicio' : 'Nuevo servicio'} onClose={() => onClose(false)}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha"><input className={input} type="date" required value={form.fecha} onChange={e => set('fecha', e.target.value)} /></Campo>
          <Campo label="Kilometraje"><input className={input} type="number" min="0" value={form.kilometraje} onChange={e => set('kilometraje', e.target.value)} /></Campo>
        </div>
        <Campo label="Motivo de ingreso *"><input className={input} required autoFocus value={form.motivo} onChange={e => set('motivo', e.target.value)} /></Campo>
        <Campo label="Trabajos realizados"><textarea className={input} rows={3} value={form.trabajos} onChange={e => set('trabajos', e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Costo"><input className={input} type="number" min="0" step="0.01" value={form.costo} onChange={e => set('costo', e.target.value)} /></Campo>
          <Campo label="Estado">
            <select className={input} value={form.estado} onChange={e => set('estado', e.target.value)}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Guardar</button>
      </form>
    </Modal>
  );
}
