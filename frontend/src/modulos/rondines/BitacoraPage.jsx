import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { input, tarjeta } from '../../ui';
import * as rond from './api';

const hoy = () => new Date().toLocaleDateString('en-CA');
const hora = (v) => new Date(v).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

export default function BitacoraPage() {
  const [fecha, setFecha] = useState(hoy());
  const [registros, setRegistros] = useState([]);
  useEffect(() => { rond.getRegistros(fecha).then(setRegistros).catch(() => {}); }, [fecha]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold flex-1">Bitácora de rondines</h1>
        <div className="w-40 shrink-0"><input type="date" className={input} value={fecha} max={hoy()} onChange={e => setFecha(e.target.value)} /></div>
      </div>
      <p className="text-sm text-zinc-500 mb-3">Para registrar un paso, escanea el QR del punto con la cámara del celular.</p>
      <div className={`${tarjeta} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>{['Hora', 'Punto', 'Guardia', 'Ubicación', 'Nota'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {registros.map(r => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-mono">{hora(r.created_at)}</td>
                <td className="px-3 py-2 font-medium">{r.punto}</td>
                <td className="px-3 py-2">{r.usuario_nombre}</td>
                <td className="px-3 py-2">
                  {r.lat != null
                    ? <a className="inline-flex items-center gap-1 text-[var(--acento)] hover:underline" target="_blank" rel="noreferrer"
                         href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}><MapPin size={14} /> Ver mapa{r.precision_m ? ` (±${r.precision_m} m)` : ''}</a>
                    : <span className="text-zinc-400">Sin GPS</span>}
                </td>
                <td className="px-3 py-2 text-zinc-600">{r.nota || '—'}</td>
              </tr>
            ))}
            {!registros.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400">Sin registros este día</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
