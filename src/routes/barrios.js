// src/routes/barrios.js
const router = require('express').Router();
const { getBarrios } = require('../controllers/barrios.controller');

router.get('/', getBarrios); // público — para registro de clientes

module.exports = router;