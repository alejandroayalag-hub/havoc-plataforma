import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmpleados } from './api';

const ACCESOS = [
  { to: '/personal/pagos',          label: 'Pagos',    icon: '💳' },
  { to: '/personal/checador', label: 'Checador', icon: '🕐' },
  { to: '/personal/formatos',       label: 'Formatos', icon: '📄' },
];

const ESTATUS_COLOR = {
  activo: 'bg-green-100 text-green-800',
  inactivo: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-red-100 text-red-800',
};

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    getEmpleados().then(setEmpleados).finally(() => setLoading(false));
  }, []);

  const filtrados = empleados.filter(e =>
    `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {ACCESOS.map(a => (
          <Link key={a.to} to={a.to}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--color-sage)', backgroundColor: 'var(--color-primary)', color: 'var(--color-dark)' }}>
            <span>{a.icon}</span>{a.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Personal</h1>
        <Link to="/personal/nuevo"
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-sm">
          + Nuevo integrante
        </Link>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="border rounded px-3 py-2 w-full mb-4 text-sm"
      />

      {filtrados.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay personal registrado.</p>
      ) : (
        <div className="overflow-x-auto rounded shadow bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Puesto</th>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-left">Estatus</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {e.apellido_paterno} {e.apellido_materno}, {e.nombre}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.puesto || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.departamento || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTATUS_COLOR[e.estatus]}`}>
                      {e.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/personal/${e.id}`} className="text-blue-700 hover:underline">
                      Ver expediente
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
