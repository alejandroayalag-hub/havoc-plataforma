import api from '../../api/client';

const d = (p) => p.then(r => r.data);
export const getExpedientes   = (params) => d(api.get('/expedientes', { params }));
export const getExpediente    = (id) => d(api.get(`/expedientes/${id}`));
export const crearExpediente  = (data) => d(api.post('/expedientes', data));
export const editarExpediente = (id, data) => d(api.put(`/expedientes/${id}`, data));
export const borrarDocumento  = (id) => d(api.delete(`/expedientes/documentos/${id}`));

export function subirDocumento(id, archivo) {
  const fd = new FormData();
  fd.append('archivo', archivo);
  return d(api.post(`/expedientes/${id}/documentos`, fd));
}

export async function descargarDocumento(doc) {
  const { data } = await api.get(`/expedientes/documentos/${doc.id}/descargar`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = Object.assign(document.createElement('a'), { href: url, download: doc.nombre });
  a.click();
  URL.revokeObjectURL(url);
}
