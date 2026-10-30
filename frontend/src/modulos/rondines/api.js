import api from '../../api/client';

const d = (p) => p.then(r => r.data);
export const getPuntos    = () => d(api.get('/rondines/puntos'));
export const crearPunto   = (data) => d(api.post('/rondines/puntos', data));
export const editarPunto  = (id, data) => d(api.put(`/rondines/puntos/${id}`, data));
export const getPunto     = (codigo) => d(api.get(`/rondines/punto/${codigo}`));
export const registrar    = (codigo, data) => d(api.post(`/rondines/punto/${codigo}/registrar`, data));
export const getRegistros = (fecha) => d(api.get('/rondines/registros', { params: { fecha } }));
