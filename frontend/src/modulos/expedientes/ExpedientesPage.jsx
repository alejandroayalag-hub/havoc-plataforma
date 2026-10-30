import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { input, boton, tarjeta } from '../../ui';
import ExpedienteModal from './ExpedienteModal';
import * as exp from './api';

export default function ExpedientesPage() {
  const [expedientes, setExpedientes] = useState([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('abierto');
  const [nuevo, setNuevo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => exp.getExpedientes({ q, estado }).then(setExpedientes).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, estado]);

  return (
    <div>
      <div className="flex items-center mb-4">
        <h1 className="text-2xl font-bold flex-1">Expedientes</h1>
        <button className={boton} onClick={() => setNuevo(true)}>+ Nuevo expediente</button>
      </div>
      <div className="flex gap-2 mb-3">
        <input className={input} placeholder="Buscar por número, título, cliente o nombre de documento" value={q} onChange={e => setQ(e.target.value)} />
        <select className={`${input} w-36`} value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="abierto">Abiertos</option><option value="cerrado">Cerrados</option><option value="">Todos</option>
        </select>
      </div>
      <div className={`${tarjeta} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>{['Número', 'Título', 'Cliente', 'Materia', 'Docs'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {expedientes.map(e => (
              <tr key={e.id} className={`border-t border-zinc-100 ${e.estado === 'cerrado' ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 font-mono text-xs"><Link className="hover:underline" to={`/expedientes/${e.id}`}>{e.numero}</Link></td>
                <td className="px-3 py-2"><Link className="font-medium hover:underline" to={`/expedientes/${e.id}`}>{e.titulo}</Link></td>
                <td className="px-3 py-2">{e.cliente || '—'}</td>
                <td className="px-3 py-2">{e.materia || '—'}</td>
                <td className="px-3 py-2">{e.documentos}</td>
              </tr>
            ))}
            {!expedientes.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400">Sin expedientes</td></tr>}
          </tbody>
        </table>
      </div>
      {nuevo && <ExpedienteModal expediente={{}} onClose={(e) => { setNuevo(false); if (e) navigate(`/expedientes/${e.id}`); }} />}
    </div>
  );
}
