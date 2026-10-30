import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { boton, botonSec, tarjeta, dinero } from '../../ui';
import { VehiculoModal, ServicioModal, Estado, fecha } from './comunes';
import * as taller from './api';

export default function VehiculoPage() {
  const { id } = useParams();
  const [v, setV] = useState(null);
  const [editando, setEditando] = useState(false);
  const [servicio, setServicio] = useState(null);

  const cargar = () => taller.getVehiculo(id).then(setV).catch(() => {});
  useEffect(() => { cargar(); }, [id]);
  if (!v) return null;

  const total = v.servicios.reduce((s, x) => s + Number(x.costo), 0);
  return (
    <div>
      <Link to="/taller" className="text-sm text-zinc-500 hover:underline">← Vehículos</Link>
      <div className={`${tarjeta} p-4 mt-1 mb-4 flex flex-wrap gap-4 items-start`}>
        <div className="flex-1 min-w-48">
          <h1 className="text-2xl font-bold">{v.marca} {v.modelo} {v.anio || ''}</h1>
          <p className="font-mono text-sm">{v.placas}{v.color ? ` · ${v.color}` : ''}</p>
          <p className="text-sm text-zinc-600 mt-1">{v.propietario}{v.telefono ? ` · ${v.telefono}` : ''}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-zinc-500">{v.servicios.length} servicio(s)</p>
          <p className="font-semibold">{dinero(total)}</p>
        </div>
        <button className={botonSec} onClick={() => setEditando(true)}>Editar</button>
      </div>
      <div className="flex items-center mb-3">
        <h2 className="text-lg font-semibold flex-1">Historial de servicios</h2>
        <button className={boton} onClick={() => setServicio({})}>+ Nuevo servicio</button>
      </div>
      <div className="space-y-2">
        {v.servicios.map(s => (
          <button key={s.id} className={`${tarjeta} p-3 w-full text-left hover:border-zinc-400`} onClick={() => setServicio(s)}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{fecha(s.fecha)}</span>
              {s.kilometraje != null && <span className="text-zinc-500 font-mono text-xs">{Number(s.kilometraje).toLocaleString('es-MX')} km</span>}
              <Estado e={s.estado} />
              <span className="ml-auto font-semibold">{dinero(s.costo)}</span>
            </div>
            <p className="text-sm mt-1">{s.motivo}</p>
            {s.trabajos && <p className="text-sm text-zinc-500 mt-1 whitespace-pre-line">{s.trabajos}</p>}
          </button>
        ))}
        {!v.servicios.length && <p className="text-center text-zinc-400 py-8 text-sm">Sin servicios registrados</p>}
      </div>
      {editando && <VehiculoModal vehiculo={v} onClose={(r) => { setEditando(false); if (r) cargar(); }} />}
      {servicio && <ServicioModal vehiculoId={v.id} servicio={servicio} onClose={(r) => { setServicio(null); if (r) cargar(); }} />}
    </div>
  );
}
