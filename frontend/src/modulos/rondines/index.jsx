import { Routes, Route, Navigate } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { esAdmin } from '../../sesion';
import BitacoraPage from './BitacoraPage';
import PuntosPage from './PuntosPage';
import RegistrarPage from './RegistrarPage';

function Rutas() {
  return (
    <Routes>
      <Route index element={<BitacoraPage />} />
      {esAdmin() && <Route path="puntos" element={<PuntosPage />} />}
      <Route path="p/:codigo" element={<RegistrarPage />} />
      <Route path="*" element={<Navigate to="/rondines" replace />} />
    </Routes>
  );
}

export default {
  descripcion: 'Puntos de control con QR, GPS y bitácora de recorridos',
  Icono: ScanLine,
  get menu() {
    return [
      { to: '/rondines', label: 'Bitácora', end: true },
      ...(esAdmin() ? [{ to: '/rondines/puntos', label: 'Puntos' }] : []),
    ];
  },
  Rutas,
};
