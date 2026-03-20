// src/controllers/catalogo.controller.js
const catalogoService = require('../services/catalogo.service');

const getCatalogo = async (req, res) => {
  try {
    const data = await catalogoService.getCatalogo();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await catalogoService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getCatalogo, toggleEstado };