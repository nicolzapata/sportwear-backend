// src/routes/clientes.js
const router = require('express').Router();
const {
  getClientes, getClienteById, crearCliente,
  actualizarCliente, toggleEstado, togglePermisoPagos
} = require('../controllers/clientes.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',                    verificarToken, soloAdmin, getClientes);
router.get('/:id',                 verificarToken, getClienteById);
router.post('/',                   verificarToken, soloAdmin, crearCliente);
router.put('/:id',                 verificarToken, soloAdmin, actualizarCliente);
router.patch('/:id/estado',        verificarToken, soloAdmin, toggleEstado);
router.patch('/:id/permiso-pagos', verificarToken, soloAdmin, togglePermisoPagos);

module.exports = router;