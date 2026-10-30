import { Routes, Route, Navigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import VehiculosPage from './VehiculosPage';
import VehiculoPage from './VehiculoPage';

function Rutas() {
  return (
    <Routes>
      <Route index element={<VehiculosPage />} />
      <Route path=":id" element={<VehiculoPage />} />
      <Route path="*" element={<Navigate to="/taller" replace />} />
    </Routes>
  );
}

export default {
  descripcion: 'Vehículos, servicios y su historial por cliente',
  Icono: Car,
  menu: [{ to: '/taller', label: 'Vehículos' }],
  Rutas,
};
