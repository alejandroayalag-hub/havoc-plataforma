const router = require('express').Router();
const ctrl = require('../controllers/checadasController');

// Panel web (ya con sesión y acceso al módulo). Las rutas del agente local están en publico.js
router.get('/dispositivos', ctrl.getDispositivos);
router.get('/mappings', ctrl.getAllMappings);
router.post('/mappings', ctrl.upsertMapping);
router.delete('/mappings/:id', ctrl.deleteMapping);
router.get('/empleado/:empleadoId', ctrl.getByEmpleado);

module.exports = router;
