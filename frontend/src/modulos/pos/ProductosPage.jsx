import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { input, boton, botonSec, tarjeta, Campo, Modal, dinero, cantidad, fechaHora, errorDe } from '../../ui';
import * as pos from './api';

// Inventario (solo admin): alta y edición, entradas de mercancía, ajustes por conteo y su bitácora
export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [q, setQ] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);
  const [modal, setModal] = useState(null); // { tipo: 'editar'|'entrada'|'ajuste'|'bitacora', producto }

  const cargar = () => pos.getProductos({ todos: 1 }).then(setProductos).catch(() => {});
  useEffect(() => { cargar(); pos.getProveedores().then(setProveedores).catch(() => {}); }, []);

  const texto = q.trim().toLowerCase();
  const visibles = productos.filter(p =>
    (!texto || [p.nombre, p.codigo_barras, p.categoria].some(v => v?.toLowerCase().includes(texto))) &&
    (!soloBajo || (p.activo && Number(p.stock) <= Number(p.stock_minimo))));
  const bajos = productos.filter(p => p.activo && Number(p.stock) <= Number(p.stock_minimo)).length;
  const valor = productos.filter(p => p.activo).reduce((t, p) => t + Number(p.stock) * Number(p.precio_costo), 0);
  const cerrar = (recargar) => { setModal(null); if (recargar) cargar(); };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold flex-1">Productos</h1>
        <Link to="/pos/proveedores" className={botonSec}>Proveedores</Link>
        <button className={boton} onClick={() => setModal({ tipo: 'editar', producto: {} })}>+ Nuevo producto</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input className={`${input} md:w-80`} placeholder="Buscar por nombre, código o categoría" value={q} onChange={e => setQ(e.target.value)} />
        <label className="text-sm flex items-center gap-1">
          <input type="checkbox" checked={soloBajo} onChange={e => setSoloBajo(e.target.checked)} />
          Por surtir <span className={`font-mono ${bajos ? 'text-red-600' : ''}`}>({bajos})</span>
        </label>
        <span className="ml-auto text-sm text-zinc-500">Inventario a costo: <b className="font-mono text-zinc-800">{dinero(valor)}</b></span>
      </div>

      <div className={`${tarjeta} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>{['Producto', 'Código', 'Costo', 'Precio', 'Margen', 'Existencia', ''].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {visibles.map(p => {
              const bajo = Number(p.stock) <= Number(p.stock_minimo);
              const margen = Number(p.precio_venta) > 0 ? (1 - Number(p.precio_costo) / Number(p.precio_venta)) * 100 : 0;
              return (
                <tr key={p.id} className={`border-t border-zinc-100 ${p.activo ? '' : 'opacity-40'}`}>
                  <td className="px-3 py-2">
                    <button className="font-medium hover:underline text-left" onClick={() => setModal({ tipo: 'editar', producto: p })}>{p.nombre}</button>
                    <span className="block text-xs text-zinc-400">{[p.categoria, p.proveedor].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{p.codigo_barras || '—'}</td>
                  <td className="px-3 py-2 font-mono">{dinero(p.precio_costo)}</td>
                  <td className="px-3 py-2 font-mono">{dinero(p.precio_venta)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{margen.toFixed(0)}%</td>
                  <td className="px-3 py-2">
                    <span className={`font-mono ${bajo ? 'text-red-600 font-semibold' : ''}`}>{cantidad(p.stock)}</span>
                    <span className="text-xs text-zinc-400"> {p.unidad}{bajo && ` · mín ${cantidad(p.stock_minimo)}`}</span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-xs space-x-3">
                    <button className="hover:underline" style={{ color: 'var(--acento)' }} onClick={() => setModal({ tipo: 'entrada', producto: p })}>+ Entrada</button>
                    <button className="hover:underline text-zinc-500" onClick={() => setModal({ tipo: 'ajuste', producto: p })}>Ajustar</button>
                    <button className="hover:underline text-zinc-500" onClick={() => setModal({ tipo: 'bitacora', producto: p })}>Historial</button>
                  </td>
                </tr>
              );
            })}
            {!visibles.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-400">Sin productos</td></tr>}
          </tbody>
        </table>
      </div>

      {modal?.tipo === 'editar' && <ProductoModal producto={modal.producto} proveedores={proveedores} onClose={cerrar} />}
      {modal?.tipo === 'entrada' && <EntradaModal producto={modal.producto} onClose={cerrar} />}
      {modal?.tipo === 'ajuste' && <AjusteModal producto={modal.producto} onClose={cerrar} />}
      {modal?.tipo === 'bitacora' && <BitacoraModal producto={modal.producto} onClose={cerrar} />}
    </div>
  );
}

function ProductoModal({ producto, proveedores, onClose }) {
  const nuevo = !producto.id;
  const [form, setForm] = useState({
    nombre: producto.nombre || '', codigo_barras: producto.codigo_barras || '', categoria: producto.categoria || '',
    unidad: producto.unidad || 'pza', precio_costo: producto.precio_costo ?? '', precio_venta: producto.precio_venta ?? '',
    stock: '', stock_minimo: producto.stock_minimo ?? '', proveedor_id: producto.proveedor_id || '', activo: producto.activo ?? true,
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function guardar(e) {
    e.preventDefault();
    setError('');
    const { stock, ...datos } = form;
    try {
      if (nuevo) await pos.crearProducto({ ...datos, stock });
      else await pos.editarProducto(producto.id, datos);
      onClose(true);
    } catch (err) { setError(errorDe(err, 'No se pudo guardar')); }
  }

  return (
    <Modal titulo={nuevo ? 'Nuevo producto' : 'Editar producto'} onClose={() => onClose(false)} ancho="max-w-lg">
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Nombre *"><input className={input} required autoFocus value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Código de barras (escanéalo aquí)">
            <input className={`${input} font-mono`} value={form.codigo_barras} onChange={e => set('codigo_barras', e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
          </Campo>
          <Campo label="Categoría"><input className={input} value={form.categoria} onChange={e => set('categoria', e.target.value)} /></Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Se vende por">
            <select className={input} value={form.unidad} onChange={e => set('unidad', e.target.value)}>
              {Object.entries(pos.UNIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
          <Campo label="Costo"><input className={`${input} font-mono`} type="number" min="0" step="0.01" value={form.precio_costo} onChange={e => set('precio_costo', e.target.value)} /></Campo>
          <Campo label="Precio de venta *"><input className={`${input} font-mono`} type="number" min="0.01" step="0.01" required value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} /></Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {nuevo && <Campo label="Existencia inicial"><input className={`${input} font-mono`} type="number" min="0" step="0.001" value={form.stock} onChange={e => set('stock', e.target.value)} /></Campo>}
          <Campo label="Mínimo (avisa al llegar)"><input className={`${input} font-mono`} type="number" min="0" step="0.001" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} /></Campo>
          <Campo label="Proveedor">
            <select className={input} value={form.proveedor_id} onChange={e => set('proveedor_id', e.target.value)}>
              <option value="">—</option>
              {proveedores.filter(p => p.activo || p.id === producto.proveedor_id).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
        </div>
        {!nuevo && (
          <>
            <p className="text-xs text-zinc-500">La existencia se mueve con “+ Entrada” o “Ajustar” para que quede registro.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} /> Activo (se puede vender)
            </label>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Guardar</button>
      </form>
    </Modal>
  );
}

function EntradaModal({ producto, onClose }) {
  const [form, setForm] = useState({ cantidad: '', costo_unitario: producto.precio_costo, nota: '' });
  const [error, setError] = useState('');
  async function guardar(e) {
    e.preventDefault();
    try { await pos.entrada(producto.id, form); onClose(true); } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={`Entrada · ${producto.nombre}`} onClose={() => onClose(false)}>
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-sm text-zinc-500">Hay {cantidad(producto.stock)} {producto.unidad}.</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={`Llegaron (${producto.unidad})`}>
            <input className={`${input} font-mono`} type="number" min="0.001" step="0.001" required autoFocus value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
          </Campo>
          <Campo label="Costo unitario">
            <input className={`${input} font-mono`} type="number" min="0" step="0.01" value={form.costo_unitario} onChange={e => setForm({ ...form, costo_unitario: e.target.value })} />
          </Campo>
        </div>
        <Campo label="Nota (factura, proveedor…)"><input className={input} value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} /></Campo>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Registrar entrada</button>
      </form>
    </Modal>
  );
}

function AjusteModal({ producto, onClose }) {
  const [form, setForm] = useState({ stock: producto.stock, nota: '' });
  const [error, setError] = useState('');
  async function guardar(e) {
    e.preventDefault();
    try { await pos.ajuste(producto.id, form); onClose(true); } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={`Ajustar · ${producto.nombre}`} onClose={() => onClose(false)}>
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-sm text-zinc-500">El sistema dice {cantidad(producto.stock)} {producto.unidad}. Captura lo que contaste.</p>
        <Campo label="Existencia real">
          <input className={`${input} font-mono`} type="number" min="0" step="0.001" required autoFocus value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
        </Campo>
        <Campo label="Motivo *"><input className={input} required placeholder="Conteo, merma, caducado…" value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} /></Campo>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Guardar ajuste</button>
      </form>
    </Modal>
  );
}

function BitacoraModal({ producto, onClose }) {
  const [movs, setMovs] = useState(null);
  useEffect(() => { pos.movimientos(producto.id).then(setMovs).catch(() => setMovs([])); }, [producto.id]);
  return (
    <Modal titulo={`Historial · ${producto.nombre}`} onClose={() => onClose(false)} ancho="max-w-lg">
      <p className="text-xs text-zinc-500 mb-2">Entradas y ajustes (las ventas se ven en Reportes).</p>
      {!movs ? <p className="text-sm text-zinc-400">Cargando…</p> : (
        <ul className="text-sm divide-y divide-zinc-100">
          {movs.map(m => (
            <li key={m.id} className="py-2 flex gap-3">
              <span className={`font-mono w-20 text-right ${Number(m.cantidad) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {Number(m.cantidad) > 0 ? '+' : ''}{cantidad(m.cantidad)}
              </span>
              <span className="flex-1">
                {m.tipo === 'entrada' ? 'Entrada' : 'Ajuste'}{m.nota && ` · ${m.nota}`}
                <span className="block text-xs text-zinc-400">{fechaHora(m.fecha)} · {m.usuario || '—'}{m.costo_unitario && ` · costo ${dinero(m.costo_unitario)}`}</span>
              </span>
            </li>
          ))}
          {!movs.length && <li className="py-4 text-center text-zinc-400">Sin movimientos</li>}
        </ul>
      )}
    </Modal>
  );
}
