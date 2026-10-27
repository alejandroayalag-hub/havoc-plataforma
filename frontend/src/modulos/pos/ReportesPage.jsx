import { useEffect, useState } from 'react';
import { input, tarjeta, Campo, dinero, cantidad, errorDe } from '../../ui';
import { TablaVentas } from './CajaPage';
import * as pos from './api';

const local = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
const RANGOS = {
  Hoy: () => { const h = local(new Date()); return [h, h]; },
  'Esta semana': () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [local(d), local(new Date())]; },
  'Este mes': () => { const d = new Date(); return [local(new Date(d.getFullYear(), d.getMonth(), 1)), local(d)]; },
};

export default function ReportesPage() {
  const [[desde, hasta], setRango] = useState(RANGOS.Hoy());
  const [r, setR] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState('');

  const cargar = () => {
    pos.getReportes({ desde, hasta }).then(setR).catch(e => setError(errorDe(e)));
    pos.getVentas({ desde, hasta }).then(setVentas).catch(() => {});
  };
  useEffect(() => { cargar(); }, [desde, hasta]);

  async function cancelar(v) {
    if (!window.confirm(`¿Cancelar la venta #${v.id} por ${dinero(v.total)}? La mercancía regresa al inventario.`)) return;
    try { await pos.cancelarVenta(v.id); cargar(); } catch (e) { setError(errorDe(e)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-bold flex-1">Reportes</h1>
        {Object.entries(RANGOS).map(([l, f]) => (
          <button key={l} className="text-xs px-3 py-1.5 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50" onClick={() => setRango(f())}>{l}</button>
        ))}
        <Campo label="Desde"><input type="date" className={input} value={desde} onChange={e => setRango([e.target.value, hasta])} /></Campo>
        <Campo label="Hasta"><input type="date" className={input} value={hasta} onChange={e => setRango([desde, e.target.value])} /></Campo>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {r && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Ventas', dinero(r.resumen.ingresos)], ['Ganancia', dinero(r.resumen.ganancia)],
              ['Margen', `${r.resumen.margen}%`], ['Tickets', r.resumen.num_ventas]].map(([l, v]) => (
              <div key={l} className={`${tarjeta} p-4`}>
                <p className="text-xs text-zinc-500">{l}</p>
                <p className="font-mono text-2xl font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Lista titulo="Más vendidos" filas={r.top_productos.map(p => [p.nombre, `${cantidad(p.cantidad)} ${p.unidad}`, dinero(p.ingresos)])} />
            <div className="space-y-4">
              <Lista titulo="Por forma de pago" filas={r.por_metodo.map(m => [pos.METODOS[m.metodo_pago], `${m.num_ventas} tickets`, dinero(m.total)])} />
              <Lista titulo="Por vendedor" filas={r.por_vendedor.map(v => [v.nombre, `${v.num_ventas} tickets`, dinero(v.total)])} />
            </div>
            <Lista titulo="Por surtir (en o bajo el mínimo)" alerta
                   filas={r.stock_bajo.map(p => [p.nombre, `mín ${cantidad(p.stock_minimo)}`, `${cantidad(p.stock)} ${p.unidad}`])} />
          </div>
        </>
      )}

      <section>
        <h2 className="font-semibold mb-2">Ventas del periodo</h2>
        <TablaVentas ventas={ventas} onCancelar={cancelar} conVendedor />
      </section>
    </div>
  );
}

function Lista({ titulo, filas, alerta }) {
  return (
    <div className={`${tarjeta} p-4`}>
      <h2 className="font-semibold text-sm mb-2">{titulo}</h2>
      {filas.map(([a, b, c], i) => (
        <div key={i} className="flex gap-2 text-sm py-1 border-t border-zinc-100 first:border-0">
          <span className="flex-1">{a}</span>
          <span className="text-xs text-zinc-400">{b}</span>
          <span className={`font-mono ${alerta ? 'text-red-600' : ''}`}>{c}</span>
        </div>
      ))}
      {!filas.length && <p className="text-sm text-zinc-400">—</p>}
    </div>
  );
}
