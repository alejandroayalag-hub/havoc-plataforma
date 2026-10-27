const router = require('express').Router();
const ctrl = require('../controllers/empleadosController');
const upload = require('../upload');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/foto', upload.single('foto'), ctrl.uploadFoto);
router.get('/:id/foto', ctrl.foto);

module.exports = router;
