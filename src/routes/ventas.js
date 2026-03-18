// src/routes/ventas.js
const router = require('express').Router();
const { getVentas, getVentaById, crearVenta, cambiarEstado } = require('../controllers/ventas.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, soloAdmin, getVentas);
router.get('/:id',          verificarToken, soloAdmin, getVentaById);
router.post('/',            verificarToken, soloAdmin, crearVenta);
router.patch('/:id/estado', verificarToken, soloAdmin, cambiarEstado);

module.exports = router;