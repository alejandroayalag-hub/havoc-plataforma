import api from '../../api/client';


export const getEmpleados = () => api.get('/personal/empleados').then(r => r.data);
export const getEmpleado = (id) => api.get(`/personal/empleados/${id}`).then(r => r.data);
export const createEmpleado = (data) => api.post('/personal/empleados', data).then(r => r.data);
export const updateEmpleado = (id, data) => api.put(`/personal/empleados/${id}`, data).then(r => r.data);
export const deleteEmpleado = (id) => api.delete(`/personal/empleados/${id}`);
export const uploadFoto = (id, formData) => api.post(`/personal/empleados/${id}/foto`, formData).then(r => r.data);


export const getTipos = () => api.get('/personal/documentos/tipos').then(r => r.data);
export const getDocumentos = (empleadoId) => api.get(`/personal/documentos/empleado/${empleadoId}`).then(r => r.data);
export const uploadDocumento = (formData) => api.post('/personal/documentos/upload', formData).then(r => r.data);
export const deleteDocumento = (id) => api.delete(`/personal/documentos/${id}`);

export const generarContrato = (empleadoId, datos) =>
  api.post(`/personal/contratos/generar/${empleadoId}`, datos).then(r => r.data);

export const abrirDocumento = async (id, filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const win = ['pdf', 'jpg', 'jpeg', 'png'].includes(ext) ? window.open('', '_blank') : null;
  try {
    const res = await api.get(`/personal/documentos/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    if (win) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    if (win) win.close();
    // Leer el mensaje de error del blob
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try { alert(JSON.parse(text).error); } catch { alert('No se pudo abrir el archivo.'); }
    } else {
      alert('No se pudo abrir el archivo.');
    }
  }
};


export const parsearPdf = (formData) =>
  api.post('/personal/pagos/parsear', formData).then(r => r.data);

export const importarPagos = (formData) =>
  api.post('/personal/pagos/importar', formData).then(r => r.data);

export const getSemanas = () => api.get('/personal/pagos/semanas').then(r => r.data);

export const getPagosSemana = (id) => api.get(`/personal/pagos/semana/${id}`).then(r => r.data);

export const getPagosEmpleado = (id) => api.get(`/personal/pagos/empleado/${id}`).then(r => r.data);

export const deleteSemana = (id) => api.delete(`/personal/pagos/semana/${id}`);

export const descargarPdf = async (id, filename) => {
  const res = await api.get(`/personal/pagos/semana/${id}/descargar`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};


export const getTiposConFormato = () => api.get('/personal/formatos');

export const subirFormato = (tipoId, archivo) => {
  const fd = new FormData();
  fd.append('archivo', archivo);
  return api.post(`/personal/formatos/${tipoId}`, fd);
};

export const eliminarFormato = (tipoId) => api.delete(`/personal/formatos/${tipoId}`);

export const descargarFormato = (tipoId, nombre) => {
  return api.get(`/personal/formatos/${tipoId}/descargar`, { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  });
};


export const getChecadas = (empleadoId, params = {}) =>
  api.get(`/personal/checadas/empleado/${empleadoId}`, { params }).then(r => r.data);

export const getMappings = () =>
  api.get('/personal/checadas/mappings').then(r => r.data);

export const upsertMapping = (data) =>
  api.post('/personal/checadas/mappings', data).then(r => r.data);

export const deleteMapping = (id) =>
  api.delete(`/personal/checadas/mappings/${id}`);

export const getDispositivos = () =>
  api.get('/personal/checadas/dispositivos').then(r => r.data);

export const fotoUrl = (id) =>
  api.get(`/personal/empleados/${id}/foto`, { responseType: 'blob' }).then(r => URL.createObjectURL(r.data));
