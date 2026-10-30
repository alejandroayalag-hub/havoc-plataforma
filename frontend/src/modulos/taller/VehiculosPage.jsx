import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { input, boton, tarjeta } from '../../ui';
import { VehiculoModal, Estado, fecha } from './comunes';
import * as taller from './api';

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState([]);
  const [q, setQ] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => taller.getVehiculos(q).then(setVehiculos).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="flex items-center mb-4">
        <h1 className="text-2xl font-bold flex-1">Vehículos</h1>
        <button className={boton} onClick={() => setNuevo(true)}>+ Nuevo vehículo</button>
      </div>
      <input className={`${input} mb-3`} placeholder="Buscar por placas, marca, modelo o propietario" value={q} onChange={e => setQ(e.target.value)} />
      <div className={`${tarjeta} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>{['Placas', 'Vehículo', 'Propietario', 'Último servicio', ''].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {vehiculos.map(v => (
              <tr key={v.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-mono"><Link className="font-medium hover:underline" to={`/taller/${v.id}`}>{v.placas}</Link></td>
                <td className="px-3 py-2">{v.marca} {v.modelo} {v.anio || ''}</td>
                <td className="px-3 py-2">{v.propietario}</td>
                <td className="px-3 py-2">{v.ultimo_servicio ? fecha(v.ultimo_servicio) : '—'}</td>
                <td className="px-3 py-2">{v.ultimo_estado && <Estado e={v.ultimo_estado} />}</td>
              </tr>
            ))}
            {!vehiculos.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400">Sin vehículos</td></tr>}
          </tbody>
        </table>
      </div>
      {nuevo && <VehiculoModal vehiculo={{}} onClose={(v) => { setNuevo(false); if (v) navigate(`/taller/${v.id}`); }} />}
    </div>
  );
}
