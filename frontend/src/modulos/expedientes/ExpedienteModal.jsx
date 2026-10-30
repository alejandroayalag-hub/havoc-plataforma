import { useState } from 'react';
import { input, boton, Campo, Modal, errorDe } from '../../ui';
import * as exp from './api';

export default function ExpedienteModal({ expediente, onClose }) {
  const [form, setForm] = useState({
    numero: expediente.numero || '', titulo: expediente.titulo || '', cliente: expediente.cliente || '',
    materia: expediente.materia || '', estado: expediente.estado || 'abierto', notas: expediente.notas || '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function guardar(e) {
    e.preventDefault();
    try {
      onClose(expediente.id ? await exp.editarExpediente(expediente.id, form) : await exp.crearExpediente(form));
    } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={expediente.id ? 'Editar expediente' : 'Nuevo expediente'} onClose={() => onClose(null)}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Número *"><input className={input} required autoFocus value={form.numero} onChange={e => set('numero', e.target.value)} /></Campo>
          <Campo label="Materia"><input className={input} value={form.materia} onChange={e => set('materia', e.target.value)} /></Campo>
        </div>
        <Campo label="Título *"><input className={input} required value={form.titulo} onChange={e => set('titulo', e.target.value)} /></Campo>
        <Campo label="Cliente"><input className={input} value={form.cliente} onChange={e => set('cliente', e.target.value)} /></Campo>
        <Campo label="Notas"><textarea className={input} rows={3} value={form.notas} onChange={e => set('notas', e.target.value)} /></Campo>
        {expediente.id && (
          <Campo label="Estado">
            <select className={input} value={form.estado} onChange={e => set('estado', e.target.value)}>
              <option value="abierto">Abierto</option><option value="cerrado">Cerrado</option>
            </select>
          </Campo>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Guardar</button>
      </form>
    </Modal>
  );
}
