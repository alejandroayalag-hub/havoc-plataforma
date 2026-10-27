import api from '../../api/client';

const d = (p) => p.then(r => r.data);
export const getProductos   = (params) => d(api.get('/pos/productos', { params }));
export const crearProducto  = (data) => d(api.post('/pos/productos', data));
export const editarProducto = (id, data) => d(api.put(`/pos/productos/${id}`, data));
export const entrada        = (id, data) => d(api.post(`/pos/productos/${id}/entrada`, data));
export const ajuste         = (id, data) => d(api.post(`/pos/productos/${id}/ajuste`, data));
export const movimientos    = (id) => d(api.get(`/pos/productos/${id}/movimientos`));

export const getProveedores   = () => d(api.get('/pos/proveedores'));
export const crearProveedor   = (data) => d(api.post('/pos/proveedores', data));
export const editarProveedor  = (id, data) => d(api.put(`/pos/proveedores/${id}`, data));

export const buscarClientes = (q) => d(api.get('/pos/clientes', { params: { q } }));
export const crearCliente   = (data) => d(api.post('/pos/clientes', data));

export const getCaja    = () => d(api.get('/pos/caja'));
export const abrirCaja  = (efectivo_inicial) => d(api.post('/pos/caja/abrir', { efectivo_inicial }));
export const cerrarCaja = (efectivo_final) => d(api.post('/pos/caja/cerrar', { efectivo_final }));
export const getCortes  = () => d(api.get('/pos/cajas'));

export const vender        = (data) => d(api.post('/pos/ventas', data));
export const getVentas     = (params) => d(api.get('/pos/ventas', { params }));
export const getVenta      = (id) => d(api.get(`/pos/ventas/${id}`));
export const cancelarVenta = (id) => d(api.post(`/pos/ventas/${id}/cancelar`));

export const getReportes = (params) => d(api.get('/pos/reportes', { params }));

export const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
export const UNIDADES = { pza: 'pieza', kg: 'kg', lt: 'litro', m: 'metro' };
