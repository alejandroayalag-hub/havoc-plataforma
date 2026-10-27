import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { input, boton, tarjeta, Campo, Modal, errorDe } from '../../ui';
import * as pos from './api';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [editando, setEditando] = useState(null);

  const cargar = () => pos.getProveedores().then(setProveedores).catch(() => {});
  useEffect(() => { cargar(); }, []);

  return (
    <div>
      <Link to="/pos/productos" className="text-sm text-zinc-500 hover:underline">← Productos</Link>
      <div className="flex items-center mt-1 mb-4">
        <h1 className="text-2xl font-bold flex-1">Proveedores</h1>
        <button className={boton} onClick={() => setEditando({})}>+ Nuevo proveedor</button>
      </div>
      <div className={`${tarjeta} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>{['Nombre', 'Contacto', 'Teléfono', 'Correo'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {proveedores.map(p => (
              <tr key={p.id} className={`border-t border-zinc-100 ${p.activo ? '' : 'opacity-40'}`}>
                <td className="px-3 py-2"><button className="font-medium hover:underline" onClick={() => setEditando(p)}>{p.nombre}</button></td>
                <td className="px-3 py-2">{p.contacto || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.telefono || '—'}</td>
                <td className="px-3 py-2">{p.email || '—'}</td>
              </tr>
            ))}
            {!proveedores.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-zinc-400">Sin proveedores</td></tr>}
          </tbody>
        </table>
      </div>
      {editando && <ProveedorModal proveedor={editando} onClose={(r) => { setEditando(null); if (r) cargar(); }} />}
    </div>
  );
}

function ProveedorModal({ proveedor, onClose }) {
  const [form, setForm] = useState({
    nombre: proveedor.nombre || '', contacto: proveedor.contacto || '', telefono: proveedor.telefono || '',
    email: proveedor.email || '', activo: proveedor.activo ?? true,
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function guardar(e) {
    e.preventDefault();
    try {
      if (proveedor.id) await pos.editarProveedor(proveedor.id, form); else await pos.crearProveedor(form);
      onClose(true);
    } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={proveedor.id ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => onClose(false)}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Nombre *"><input className={input} required autoFocus value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Campo>
        <Campo label="Contacto"><input className={input} value={form.contacto} onChange={e => set('contacto', e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Teléfono"><input className={input} type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></Campo>
          <Campo label="Correo"><input className={input} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Campo>
        </div>
        {proveedor.id && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} /> Activo</label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Guardar</button>
      </form>
    </Modal>
  );
}
