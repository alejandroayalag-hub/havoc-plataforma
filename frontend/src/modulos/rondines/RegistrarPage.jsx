import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { input, boton, tarjeta, errorDe } from '../../ui';
import * as rond from './api';

// Ubicación del celular; si el guardia la niega o no hay señal, el registro sale sin GPS
const ubicacion = () => new Promise(resolve => {
  if (!navigator.geolocation) return resolve({});
  navigator.geolocation.getCurrentPosition(
    p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy }),
    () => resolve({}), { enableHighAccuracy: true, timeout: 10000 });
});

export default function RegistrarPage() {
  const { codigo } = useParams();
  const [punto, setPunto] = useState(null);
  const [nota, setNota] = useState('');
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { rond.getPunto(codigo).then(setPunto).catch(err => setError(errorDe(err, 'Punto no encontrado'))); }, [codigo]);

  async function registrar() {
    setEstado('enviando'); setError('');
    try {
      const r = await rond.registrar(codigo, { ...(await ubicacion()), nota });
      setEstado(r.lat != null ? 'ok' : 'ok_sin_gps');
    } catch (err) { setError(errorDe(err)); setEstado(''); }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className={`${tarjeta} p-5 text-center`}>
        {!punto && !error && <p className="text-zinc-400">Cargando…</p>}
        {punto && <>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Punto de control</p>
          <h1 className="text-2xl font-bold">{punto.nombre}</h1>
          {punto.descripcion && <p className="text-sm text-zinc-500">{punto.descripcion}</p>}
        </>}
        {estado.startsWith('ok') ? (
          <div className="mt-5">
            <CheckCircle2 size={56} className="mx-auto text-emerald-600" />
            <p className="font-semibold mt-2">Paso registrado</p>
            <p className="text-sm text-zinc-500">{new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}{estado === 'ok_sin_gps' ? ' · sin ubicación' : ''}</p>
            <Link to="/rondines" className="text-sm text-[var(--acento)] hover:underline mt-4 inline-block">Ver mis registros de hoy</Link>
          </div>
        ) : punto && (
          <div className="mt-5 space-y-3">
            <textarea className={input} rows={2} placeholder="Nota (opcional): todo en orden, puerta abierta…" value={nota} onChange={e => setNota(e.target.value)} />
            <button className={`${boton} w-full py-3 text-base`} disabled={estado === 'enviando'} onClick={registrar}>
              {estado === 'enviando' ? 'Registrando…' : 'Registrar paso'}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    </div>
  );
}
