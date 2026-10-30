import { Routes, Route, Navigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import ExpedientesPage from './ExpedientesPage';
import ExpedientePage from './ExpedientePage';

function Rutas() {
  return (
    <Routes>
      <Route index element={<ExpedientesPage />} />
      <Route path=":id" element={<ExpedientePage />} />
      <Route path="*" element={<Navigate to="/expedientes" replace />} />
    </Routes>
  );
}

export default {
  descripcion: 'Expedientes con sus documentos y búsqueda',
  Icono: FolderOpen,
  menu: [{ to: '/expedientes', label: 'Expedientes' }],
  Rutas,
};
