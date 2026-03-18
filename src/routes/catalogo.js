// src/routes/catalogo.js
const router = require('express').Router();
const { getCatalogo, toggleEstado } = require('../controllers/catalogo.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',              getCatalogo);                             // público
router.patch('/:id/estado',  verificarToken, soloAdmin, toggleEstado);

module.exports = router;