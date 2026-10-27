// Módulo Personal: expedientes, documentos, contratos, pagos semanales (PDF BBVA) y checador biométrico.
// Viene de HAVOC Control (base Elys/RHATA).
const router = require('express').Router();

router.use('/empleados',  require('./routes/empleados'));
router.use('/documentos', require('./routes/documentos'));
router.use('/contratos',  require('./routes/contratos'));
router.use('/pagos',      require('./routes/pagos'));
router.use('/formatos',   require('./routes/formatos'));
router.use('/checadas',   require('./routes/checadas'));

module.exports = {
  nombre: 'Personal',
  router,
  publico: require('./publico'),
};
