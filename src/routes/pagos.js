// src/routes/pagos.js
const router = require('express').Router();
const { getPagos, getPagoById, crearPago, cambiarEstado } = require('../controllers/pagos.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, soloAdmin, getPagos);
router.get('/:id',          verificarToken, soloAdmin, getPagoById);
router.post('/',            verificarToken, soloAdmin, crearPago);
router.patch('/:id/estado', verificarToken, soloAdmin, cambiarEstado);

module.exports = router;