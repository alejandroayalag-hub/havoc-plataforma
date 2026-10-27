// Rutas sin sesión para el agente local del reloj checador; se autentica con x-api-key del dispositivo.
// Montadas en /api/personal/publico
const router = require('express').Router();
const ctrl = require('./controllers/checadasController');

router.post('/checador/sync', ctrl.sync);
router.get('/checador/mappings', ctrl.getMappings);

module.exports = router;
