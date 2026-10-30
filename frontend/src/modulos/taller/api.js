import api from '../../api/client';

const d = (p) => p.then(r => r.data);
export const getVehiculos    = (q) => d(api.get('/taller/vehiculos', { params: { q } }));
export const getVehiculo     = (id) => d(api.get(`/taller/vehiculos/${id}`));
export const crearVehiculo   = (data) => d(api.post('/taller/vehiculos', data));
export const editarVehiculo  = (id, data) => d(api.put(`/taller/vehiculos/${id}`, data));
export const crearServicio   = (vehiculoId, data) => d(api.post(`/taller/vehiculos/${vehiculoId}/servicios`, data));
export const editarServicio  = (id, data) => d(api.put(`/taller/servicios/${id}`, data));
