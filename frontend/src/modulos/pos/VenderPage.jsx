import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { input, boton, botonSec, tarjeta, Campo, Modal, dinero, cantidad, errorDe } from '../../ui';
import { useCarrito } from './index';
import * as pos from './api';
import Ticket from './Ticket';

export default function VenderPage() {
  const [carrito, setCarrito] = useCarrito();
  const [caja, setCaja] = useState(undefined); // undefined = cargando, null = cerrada
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [cobrar, setCobrar] = useState(false);
  const [ultima, setUltima] = useState(null);
  const [imprimir, setImprimir] = useState(null);
  const [error, setError] = useState('');
  const buscador = useRef(null);

  useEffect(() => { pos.getCaja().then(setCaja).catch(e => setError(errorDe(e))); }, []);

  // Espera 250 ms: el lector de código teclea muy rápido y termina con Enter
  useEffect(() => {
    const q = busqueda.trim();
    if (!q) return;
    const t = setTimeout(() => pos.getProductos({ q }).then(setResultados).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    if (!imprimir) return;
    const fin = () => setImprimir(null);
    window.addEventListener('afterprint', fin, { once: true });
    window.print();
    return () => window.removeEventListener('afterprint', fin);
  }, [imprimir]);

  function agregar(p) {
    setError('');
    if (Number(p.stock) <= 0) return setError(`"${p.nombre}" no tiene existencia`);
    setCarrito(c => c.some(i => i.id === p.id)
      ? c.map(i => (i.id === p.id && p.unidad === 'pza' ? { ...i, cantidad: i.cantidad + 1 } : i))
      : [...c, { id: p.id, nombre: p.nombre, unidad: p.unidad, precio: Number(p.precio_venta), stock: Number(p.stock), cantidad: 1 }]);
    setBusqueda('');
    setResultados([]);
    buscador.current?.focus();
  }

  // Enter: código de barras exacto o único resultado
  async function enter() {
    const q = busqueda.trim();
    if (!q) return;
    try {
      const res = await pos.getProductos({ q });
      const p = res.find(x => x.codigo_barras === q) || (res.length === 1 ? res[0] : null);
      if (p) agregar(p);
      else if (!res.length) setError(`"${q}" no está registrado`);
      else setResultados(res);
    } catch (e) { setError(errorDe(e)); }
  }

  const setCantidad = (id, v) => setCarrito(c => c.map(i => (i.id === id ? { ...i, cantidad: v } : i)));
  const total = Math.round(carrito.reduce((t, i) => t + Math.round(Number(i.cantidad || 0) * i.precio * 100) / 100, 0) * 100) / 100;
  const invalidos = carrito.filter(i => !(Number(i.cantidad) > 0) || Number(i.cantidad) > i.stock
    || (i.unidad === 'pza' && !Number.isInteger(Number(i.cantidad))));

  async function venta(datos) {
    const v = await pos.vender({
      ...datos, cliente_id: cliente?.id,
      items: carrito.map(i => ({ producto_id: i.id, cantidad: Number(i.cantidad) })),
    });
    setUltima({ ...v, cambio: v.recibido ? Number(v.recibido) - Number(v.total) : 0 });
    setCarrito([]);
    setCliente(null);
    setCobrar(false);
    pos.getCaja().then(setCaja).catch(() => {});
    buscador.current?.focus();
  }

  if (caja === undefined) return <p className="text-zinc-500">{error || 'Cargando…'}</p>;
  if (caja === null) return <AbrirCaja onAbierta={setCaja} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <div>
        <div className="relative">
          <input ref={buscador} autoFocus className={`${input} text-base py-3`} value={busqueda}
                 placeholder="Escanea o escribe el producto…"
                 onChange={e => setBusqueda(e.target.value)} onKeyDown={e => e.key === 'Enter' && enter()} />
          {busqueda.trim() && resultados.length > 0 && (
            <div className={`${tarjeta} absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto z-10 shadow-lg`}>
              {resultados.map(p => (
                <button key={p.id} onClick={() => agregar(p)}
                        className={`w-full flex justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-50 border-b border-zinc-100 ${Number(p.stock) > 0 ? '' : 'opacity-40'}`}>
                  <span>{p.nombre}{p.categoria && <span className="text-zinc-400"> · {p.categoria}</span>}</span>
                  <span className="font-mono whitespace-nowrap">{dinero(p.precio_venta)} · {cantidad(p.stock)} {p.unidad}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

        {ultima && (
          <div className="mt-3 text-sm bg-emerald-50 text-emerald-800 rounded-lg px-4 py-3 flex flex-wrap items-center gap-2">
            <span>Venta #{ultima.id} cobrada: <b>{dinero(ultima.total)}</b> ({pos.METODOS[ultima.metodo_pago]})</span>
            {ultima.cambio > 0 && <span className="font-bold">· Cambio {dinero(ultima.cambio)}</span>}
            <button className={`${botonSec} ml-auto py-1`} onClick={async () => setImprimir(await pos.getVenta(ultima.id))}>Imprimir ticket</button>
          </div>
        )}

        <p className="mt-6 text-xs text-zinc-400">
          Caja abierta · {caja.num_ventas} ventas · {dinero(caja.total_ventas)}
        </p>
      </div>

      {/* Carrito */}
      <div className={`${tarjeta} p-4 self-start`}>
        <div className="flex items-center mb-3">
          <h2 className="font-semibold flex-1">Carrito</h2>
          {carrito.length > 0 && <button className="text-xs text-zinc-500 hover:underline" onClick={() => window.confirm('¿Vaciar el carrito?') && setCarrito([])}>Vaciar</button>}
        </div>
        <ClienteSelector cliente={cliente} onChange={setCliente} />

        {!carrito.length && <p className="text-sm text-zinc-400 py-6 text-center">Escanea un producto para empezar</p>}
        {carrito.map(i => (
          <div key={i.id} className="py-2 border-b border-zinc-100">
            <div className="flex gap-2">
              <span className="text-sm flex-1">{i.nombre}</span>
              <button onClick={() => setCarrito(c => c.filter(x => x.id !== i.id))} aria-label={`Quitar ${i.nombre}`}>
                <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-600" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" step={i.unidad === 'pza' ? 1 : 0.001} value={i.cantidad}
                     onChange={e => setCantidad(i.id, e.target.value)}
                     className={`${input} w-24! py-1 font-mono`} aria-label="Cantidad" />
              <span className="text-xs text-zinc-500">{i.unidad} × {dinero(i.precio)}</span>
              <span className="ml-auto font-mono text-sm">{dinero(Number(i.cantidad || 0) * i.precio)}</span>
            </div>
            {Number(i.cantidad) > i.stock && <p className="text-xs text-red-600 mt-1">Solo hay {cantidad(i.stock)}</p>}
          </div>
        ))}

        {carrito.length > 0 && (
          <>
            <div className="flex justify-between items-baseline mt-4">
              <span className="text-sm text-zinc-500">Total</span>
              <span className="font-mono text-3xl font-bold">{dinero(total)}</span>
            </div>
            <button className={`${boton} w-full mt-4 py-3 text-base`} disabled={invalidos.length > 0}
                    onClick={() => { setError(''); setCobrar(true); }}>
              Cobrar
            </button>
          </>
        )}
      </div>

      {cobrar && <CobrarModal total={total} onCobrar={venta} onClose={() => setCobrar(false)} />}
      {imprimir && <Ticket venta={imprimir} />}
    </div>
  );
}

function AbrirCaja({ onAbierta }) {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  async function abrir(e) {
    e.preventDefault();
    try {
      await pos.abrirCaja(monto);
      onAbierta(await pos.getCaja());
    } catch (err) { setError(errorDe(err)); }
  }
  return (
    <form onSubmit={abrir} className={`${tarjeta} p-6 max-w-sm mx-auto mt-10 space-y-4`}>
      <h1 className="text-xl font-bold">Abrir caja</h1>
      <p className="text-sm text-zinc-500">Cuenta el efectivo con el que empiezas el turno.</p>
      <Campo label="Efectivo inicial">
        <input className={`${input} font-mono text-lg`} type="number" min="0" step="0.01" required autoFocus
               value={monto} onChange={e => setMonto(e.target.value)} />
      </Campo>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className={`${boton} w-full`}>Abrir caja</button>
    </form>
  );
}

function CobrarModal({ total, onCobrar, onClose }) {
  const [recibido, setRecibido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const cambio = Number(recibido) - total;

  async function cobrar(metodo_pago) {
    setEnviando(true);
    setError('');
    try {
      await onCobrar({ metodo_pago, recibido: metodo_pago === 'efectivo' ? recibido : undefined });
    } catch (e) {
      setError(errorDe(e, 'No se pudo cobrar'));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Cobrar" onClose={() => !enviando && onClose()}>
      <p className="font-mono text-4xl font-bold text-center bg-zinc-100 rounded-xl py-4 mb-4">{dinero(total)}</p>
      <Campo label="Efectivo recibido (para calcular cambio)">
        <input className={`${input} font-mono text-lg`} type="number" min="0" step="0.01" autoFocus value={recibido}
               onChange={e => setRecibido(e.target.value)} onKeyDown={e => e.key === 'Enter' && cambio >= 0 && cobrar('efectivo')} />
      </Campo>
      {recibido !== '' && (
        <p className={`mt-1 text-lg font-mono ${cambio >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {cambio >= 0 ? `Cambio: ${dinero(cambio)}` : `Faltan ${dinero(-cambio)}`}
        </p>
      )}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="grid gap-2 mt-4">
        <button className={`${boton} py-3`} disabled={enviando || (recibido !== '' && cambio < 0)} onClick={() => cobrar('efectivo')}>Efectivo</button>
        <div className="grid grid-cols-2 gap-2">
          <button className={botonSec} disabled={enviando} onClick={() => cobrar('tarjeta')}>Tarjeta</button>
          <button className={botonSec} disabled={enviando} onClick={() => cobrar('transferencia')}>Transferencia</button>
        </div>
      </div>
    </Modal>
  );
}

// Cliente opcional; sin elegir = público general
function ClienteSelector({ cliente, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => pos.buscarClientes(q.trim()).then(setRes).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  const elegir = (c) => { onChange(c); setAbierto(false); setQ(''); };

  if (!abierto) {
    return (
      <p className="text-xs text-zinc-500 mb-2">
        Cliente: <b className="text-zinc-800">{cliente?.nombre || 'Público general'}</b>{' '}
        <button className="underline" onClick={() => setAbierto(true)}>cambiar</button>
        {cliente && <> · <button className="underline" onClick={() => onChange(null)}>quitar</button></>}
      </p>
    );
  }
  return (
    <div className="mb-3 space-y-1">
      <input className={`${input} py-1.5`} autoFocus placeholder="Nombre o teléfono" value={q} onChange={e => setQ(e.target.value)} />
      {q.trim().length >= 2 && res.map(c => (
        <button key={c.id} className="block w-full text-left text-sm px-2 py-1 hover:bg-zinc-50" onClick={() => elegir(c)}>
          {c.nombre}{c.telefono && <span className="text-zinc-400"> · {c.telefono}</span>}
        </button>
      ))}
      <div className="flex gap-2 text-xs">
        {q.trim().length >= 2 && (
          <button className="underline" onClick={async () => {
            try { elegir(await pos.crearCliente({ nombre: q.trim() })); } catch (e) { setError(errorDe(e)); }
          }}>+ Registrar "{q.trim()}"</button>
        )}
        <button className="underline text-zinc-500" onClick={() => setAbierto(false)}>cancelar</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
