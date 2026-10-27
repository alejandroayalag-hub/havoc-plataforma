import { Routes, Route, Navigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import EmpleadosPage from './EmpleadosPage';
import EmpleadoDetallePage from './EmpleadoDetallePage';
import EmpleadoFormPage from './EmpleadoFormPage';
import PagosPage from './PagosPage';
import FormatosPage from './FormatosPage';
import MapeoChecadorPage from './MapeoChecadorPage';

function Rutas() {
  return (
    <Routes>
      <Route index element={<EmpleadosPage />} />
      <Route path="nuevo" element={<EmpleadoFormPage />} />
      <Route path="pagos" element={<PagosPage />} />
      <Route path="formatos" element={<FormatosPage />} />
      <Route path="checador" element={<MapeoChecadorPage />} />
      <Route path=":id" element={<EmpleadoDetallePage />} />
      <Route path=":id/editar" element={<EmpleadoFormPage />} />
      <Route path="*" element={<Navigate to="/personal" replace />} />
    </Routes>
  );
}

export default {
  descripcion: 'Expedientes, documentos, contratos, pagos y checador',
  Icono: Users,
  menu: [{ to: '/personal', label: 'Personal' }],
  Rutas,
};
