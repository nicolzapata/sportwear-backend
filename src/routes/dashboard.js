// src/routes/dashboard.js
const router = require('express').Router();
const { getResumen } = require('../controllers/dashboard.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, soloAdmin, getResumen);

module.exports = router;