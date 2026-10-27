import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { input, boton, tarjeta, Campo, dinero, fechaHora, errorDe } from '../../ui';
import * as pos from './api';

// Mi caja: totales del turno, ventas (con cancelación), corte y mis cortes anteriores
export default function CajaPage() {
  const [caja, setCaja] = useState(undefined);
  const [ventas, setVentas] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [contado, setContado] = useState('');
  const [corte, setCorte] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => {
    pos.getCaja().then(setCaja).catch(e => setError(errorDe(e)));
    pos.getVentas().then(setVentas).catch(() => {});
    pos.getCortes().then(setCortes).catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  async function cancelar(v) {
    if (!window.confirm(`¿Cancelar la venta #${v.id} por ${dinero(v.total)}? La mercancía regresa al inventario.`)) return;
    try { await pos.cancelarVenta(v.id); cargar(); } catch (e) { setError(errorDe(e)); }
  }

  async function cerrar(e) {
    e.preventDefault();
    if (!window.confirm('¿Cerrar la caja? Ya no podrás vender hasta abrir otra.')) return;
    try {
      setCorte(await pos.cerrarCaja(contado));
      setContado('');
      cargar();
    } catch (err) { setError(errorDe(err)); }
  }

  if (caja === undefined) return <p className="text-zinc-500">{error || 'Cargando…'}</p>;
  const esperado = caja && Number(caja.efectivo_inicial) + Number(caja.ventas_efectivo);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Caja</h1>
      {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {corte && (
        <div className={`${tarjeta} p-4 border-l-4`} style={{ borderLeftColor: Number(corte.diferencia) === 0 ? '#059669' : '#DC2626' }}>
          <p className="font-semibold">Caja cerrada</p>
          <p className="text-sm">Esperado {dinero(corte.efectivo_esperado)} · Contado {dinero(corte.efectivo_final)} ·{' '}
            <b>{Number(corte.diferencia) === 0 ? 'Cuadra' : `${Number(corte.diferencia) > 0 ? 'Sobran' : 'Faltan'} ${dinero(Math.abs(corte.diferencia))}`}</b>
          </p>
        </div>
      )}

      {!caja ? (
        <p className="text-zinc-500">No tienes caja abierta. <Link to="/pos" className="underline">Abrir caja para vender</Link></p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 self-start">
            {[['Efectivo inicial', caja.efectivo_inicial], ['Efectivo', caja.ventas_efectivo], ['Tarjeta', caja.ventas_tarjeta],
              ['Transferencia', caja.ventas_transferencia]].map(([l, v]) => (
              <div key={l} className={`${tarjeta} p-3`}>
                <p className="text-xs text-zinc-500">{l}</p>
                <p className="font-mono text-lg">{dinero(v)}</p>
              </div>
            ))}
            <p className="col-span-full text-sm text-zinc-500">
              Abierta {fechaHora(caja.abierta_en)} · {caja.num_ventas} ventas · total {dinero(caja.total_ventas)}
            </p>
          </div>

          <form onSubmit={cerrar} className={`${tarjeta} p-4 space-y-3`}>
            <h2 className="font-semibold">Corte de caja</h2>
            <p className="text-sm">Debe haber en efectivo: <b className="font-mono">{dinero(esperado)}</b></p>
            <Campo label="Efectivo contado">
              <input className={`${input} font-mono`} type="number" min="0" step="0.01" required value={contado}
                     onChange={e => setContado(e.target.value)} />
            </Campo>
            {contado !== '' && (
              <p className={`text-sm ${Number(contado) - esperado === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {Number(contado) - esperado === 0 ? 'Cuadra' : `${Number(contado) > esperado ? 'Sobran' : 'Faltan'} ${dinero(Math.abs(Number(contado) - esperado))}`}
              </p>
            )}
            <button className={`${boton} w-full`}>Cerrar caja</button>
          </form>
        </div>
      )}

      {caja && (
        <section>
          <h2 className="font-semibold mb-2">Ventas de este turno</h2>
          <TablaVentas ventas={ventas} onCancelar={cancelar} />
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Cortes anteriores</h2>
        <div className={`${tarjeta} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
              <tr>{['Cajero', 'Abrió', 'Cerró', 'Ventas', 'Esperado', 'Contado', 'Diferencia'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {cortes.filter(c => c.estado === 'cerrada').map(c => (
                <tr key={c.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{c.usuario}</td>
                  <td className="px-3 py-2 text-zinc-500">{fechaHora(c.abierta_en)}</td>
                  <td className="px-3 py-2 text-zinc-500">{fechaHora(c.cerrada_en)}</td>
                  <td className="px-3 py-2 font-mono">{dinero(c.total_ventas)}</td>
                  <td className="px-3 py-2 font-mono">{dinero(c.efectivo_esperado)}</td>
                  <td className="px-3 py-2 font-mono">{dinero(c.efectivo_final)}</td>
                  <td className={`px-3 py-2 font-mono ${Number(c.diferencia) === 0 ? '' : 'text-red-600'}`}>{dinero(c.diferencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function TablaVentas({ ventas, onCancelar, conVendedor }) {
  return (
    <div className={`${tarjeta} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2">#</th><th className="px-3 py-2">Hora</th>
            {conVendedor && <th className="px-3 py-2">Vendedor</th>}
            <th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Pago</th><th className="px-3 py-2 text-right">Total</th><th />
          </tr>
        </thead>
        <tbody>
          {ventas.map(v => (
            <tr key={v.id} className={`border-t border-zinc-100 ${v.estado === 'cancelada' ? 'line-through text-zinc-400' : ''}`}>
              <td className="px-3 py-2 font-mono">{v.id}</td>
              <td className="px-3 py-2">{fechaHora(v.fecha)}</td>
              {conVendedor && <td className="px-3 py-2">{v.vendedor}</td>}
              <td className="px-3 py-2">{v.cliente || '—'}</td>
              <td className="px-3 py-2">{pos.METODOS[v.metodo_pago]}</td>
              <td className="px-3 py-2 text-right font-mono">{dinero(v.total)}</td>
              <td className="px-3 py-2 text-right">
                {v.estado === 'pagada' && <button className="text-xs text-red-600 hover:underline no-underline" onClick={() => onCancelar(v)}>Cancelar</button>}
              </td>
            </tr>
          ))}
          {!ventas.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-400">Sin ventas</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
