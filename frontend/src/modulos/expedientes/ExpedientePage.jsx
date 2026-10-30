import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, Download, Trash2 } from 'lucide-react';
import { boton, botonSec, tarjeta, errorDe, fechaHora } from '../../ui';
import ExpedienteModal from './ExpedienteModal';
import * as exp from './api';

const tamano = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default function ExpedientePage() {
  const { id } = useParams();
  const [e, setE] = useState(null);
  const [editando, setEditando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const archivo = useRef();

  const cargar = () => exp.getExpediente(id).then(setE).catch(() => {});
  useEffect(() => { cargar(); }, [id]);
  if (!e) return null;

  async function subir(ev) {
    const files = [...ev.target.files];
    ev.target.value = '';
    setSubiendo(true); setError('');
    try { for (const f of files) await exp.subirDocumento(e.id, f); } catch (err) { setError(errorDe(err)); }
    setSubiendo(false); cargar();
  }
  async function borrar(doc) {
    if (!window.confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    await exp.borrarDocumento(doc.id).catch(err => setError(errorDe(err)));
    cargar();
  }

  return (
    <div>
      <Link to="/expedientes" className="text-sm text-zinc-500 hover:underline">← Expedientes</Link>
      <div className={`${tarjeta} p-4 mt-1 mb-4 flex flex-wrap gap-4 items-start`}>
        <div className="flex-1 min-w-48">
          <p className="font-mono text-xs text-zinc-500">{e.numero}{e.materia ? ` · ${e.materia}` : ''} · {e.estado === 'abierto' ? 'Abierto' : 'Cerrado'}</p>
          <h1 className="text-2xl font-bold">{e.titulo}</h1>
          {e.cliente && <p className="text-sm text-zinc-600">{e.cliente}</p>}
          {e.notas && <p className="text-sm text-zinc-500 mt-2 whitespace-pre-line">{e.notas}</p>}
        </div>
        <button className={botonSec} onClick={() => setEditando(true)}>Editar</button>
      </div>
      <div className="flex items-center mb-3">
        <h2 className="text-lg font-semibold flex-1">Documentos</h2>
        <input ref={archivo} type="file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" onChange={subir} />
        <button className={boton} disabled={subiendo} onClick={() => archivo.current.click()}>{subiendo ? 'Subiendo…' : '+ Subir documentos'}</button>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className={`${tarjeta} divide-y divide-zinc-100`}>
        {e.docs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <FileText size={18} className="text-zinc-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{doc.nombre}</p>
              <p className="text-xs text-zinc-500">{tamano(doc.tamano)} · {fechaHora(doc.created_at)}{doc.subido_por ? ` · ${doc.subido_por}` : ''}</p>
            </div>
            <button className="p-1.5 hover:bg-zinc-100 rounded" title="Descargar" onClick={() => exp.descargarDocumento(doc)}><Download size={16} /></button>
            <button className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Eliminar" onClick={() => borrar(doc)}><Trash2 size={16} /></button>
          </div>
        ))}
        {!e.docs.length && <p className="text-center text-zinc-400 py-8 text-sm">Sin documentos. Sube PDF, Word, Excel o fotos.</p>}
      </div>
      {editando && <ExpedienteModal expediente={e} onClose={(r) => { setEditando(false); if (r) cargar(); }} />}
    </div>
  );
}
