import { useConfig } from '../../App';
import { dinero, cantidad, fechaHora } from '../../ui';
import { METODOS } from './api';

// Ticket para impresora térmica de 80 mm (o "guardar como PDF")
export default function Ticket({ venta }) {
  const config = useConfig();
  const cambio = venta.recibido ? Number(venta.recibido) - Number(venta.total) : null;
  return (
    <div className="print-area hidden print:block w-[72mm] p-2 font-mono text-[11px] text-black">
      <p className="text-center font-bold text-sm">{config.nombre}</p>
      <p className="text-center">Venta #{venta.id} · {fechaHora(venta.fecha)}</p>
      <p className="text-center mb-2">Atendió: {venta.vendedor}</p>
      {venta.estado === 'cancelada' && <p className="text-center font-bold">*** CANCELADA ***</p>}
      <div className="border-t border-dashed border-black my-1" />
      {venta.items.map(i => (
        <div key={i.id}>
          <div>{i.nombre}</div>
          <div className="flex justify-between">
            <span>{cantidad(i.cantidad)} {i.unidad} × {dinero(i.precio_unitario)}</span>
            <span>{dinero(i.subtotal)}</span>
          </div>
        </div>
      ))}
      <div className="border-t border-dashed border-black my-1" />
      <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{dinero(venta.total)}</span></div>
      <div className="flex justify-between"><span>{METODOS[venta.metodo_pago]}</span><span>{venta.recibido ? dinero(venta.recibido) : ''}</span></div>
      {cambio > 0 && <div className="flex justify-between"><span>Cambio</span><span>{dinero(cambio)}</span></div>}
      {venta.cliente && <p className="mt-1">Cliente: {venta.cliente}</p>}
      <p className="text-center mt-3">¡Gracias por su compra!</p>
    </div>
  );
}
