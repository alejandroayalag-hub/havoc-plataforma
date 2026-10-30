import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { input, boton, botonSec, tarjeta, Campo, Modal, errorDe, fechaHora } from '../../ui';
import * as rond from './api';

const urlPunto = (p) => `${window.location.origin}/rondines/p/${p.codigo}`;

function Qr({ punto, size }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(urlPunto(punto), { width: size * 2, margin: 1 }).then(setSrc); }, [punto.codigo, size]);
  return src ? <img src={src} width={size} height={size} alt={`QR ${punto.nombre}`} /> : <div style={{ width: size, height: size }} />;
}

export default function PuntosPage() {
  const [puntos, setPuntos] = useState([]);
  const [editando, setEditando] = useState(null);

  const cargar = () => rond.getPuntos().then(setPuntos).catch(() => {});
  useEffect(() => { cargar(); }, []);
  const activos = puntos.filter(p => p.activo);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <h1 className="text-2xl font-bold flex-1">Puntos de control</h1>
        <button className={botonSec} onClick={() => window.print()} disabled={!activos.length}>Imprimir QR</button>
        <button className={boton} onClick={() => setEditando({})}>+ Nuevo punto</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
        {puntos.map(p => (
          <button key={p.id} className={`${tarjeta} p-3 flex gap-3 text-left hover:border-zinc-400 ${p.activo ? '' : 'opacity-40'}`} onClick={() => setEditando(p)}>
            <Qr punto={p} size={72} />
            <div className="min-w-0">
              <p className="font-medium">{p.nombre}</p>
              {p.descripcion && <p className="text-xs text-zinc-500">{p.descripcion}</p>}
              <p className="text-xs text-zinc-400 mt-1">{p.ultimo_paso ? `Último paso: ${fechaHora(p.ultimo_paso)}` : 'Sin pasos registrados'}</p>
            </div>
          </button>
        ))}
        {!puntos.length && <p className="text-zinc-400 text-sm">Sin puntos. Da de alta los lugares que el guardia debe revisar.</p>}
      </div>
      {/* Hoja para imprimir y pegar en cada punto */}
      <div className="hidden print:grid grid-cols-2 gap-8">
        {activos.map(p => (
          <div key={p.id} className="border border-zinc-300 rounded-xl p-6 flex flex-col items-center break-inside-avoid">
            <Qr punto={p} size={220} />
            <p className="text-xl font-bold mt-3">{p.nombre}</p>
            {p.descripcion && <p className="text-sm text-zinc-500">{p.descripcion}</p>}
          </div>
        ))}
      </div>
      {editando && <PuntoModal punto={editando} onClose={(r) => { setEditando(null); if (r) cargar(); }} />}
    </div>
  );
}

function PuntoModal({ punto, onClose }) {
  const [form, setForm] = useState({ nombre: punto.nombre || '', descripcion: punto.descripcion || '', activo: punto.activo ?? true });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function guardar(e) {
    e.preventDefault();
    try {
      if (punto.id) await rond.editarPunto(punto.id, form); else await rond.crearPunto(form);
      onClose(true);
    } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={punto.id ? 'Editar punto' : 'Nuevo punto'} onClose={() => onClose(false)}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Nombre *"><input className={input} required autoFocus placeholder="Ej. Bodega norte" value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Campo>
        <Campo label="Descripción"><input className={input} placeholder="Ej. Puerta trasera, junto al tablero" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} /></Campo>
        {punto.id && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} /> Activo</label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${boton} w-full`}>Guardar</button>
      </form>
    </Modal>
  );
}
