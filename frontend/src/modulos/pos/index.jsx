import { createContext, useContext, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { esAdmin } from '../../sesion';
import VenderPage from './VenderPage';
import CajaPage from './CajaPage';
import ProductosPage from './ProductosPage';
import ProveedoresPage from './ProveedoresPage';
import ReportesPage from './ReportesPage';

// El carrito vive aquí para no perderse al ir de Vender a Caja y regresar
const CarritoContext = createContext(null);
export const useCarrito = () => useContext(CarritoContext);

function Rutas() {
  const carrito = useState([]);
  const admin = esAdmin();
  return (
    <CarritoContext.Provider value={carrito}>
      <Routes>
        <Route index element={<VenderPage />} />
        <Route path="caja" element={<CajaPage />} />
        {admin && <Route path="productos" element={<ProductosPage />} />}
        {admin && <Route path="proveedores" element={<ProveedoresPage />} />}
        {admin && <Route path="reportes" element={<ReportesPage />} />}
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </CarritoContext.Provider>
  );
}

export default {
  descripcion: 'Ventas con código de barras, inventario, corte de caja y reportes',
  Icono: ShoppingCart,
  get menu() {
    return [
      { to: '/pos', label: 'Vender', end: true },
      { to: '/pos/caja', label: 'Caja' },
      ...(esAdmin() ? [{ to: '/pos/productos', label: 'Productos' }, { to: '/pos/reportes', label: 'Reportes' }] : []),
    ];
  },
  Rutas,
};
