// src/controllers/ventas.controller.js
const ventasService = require('../services/ventas.service');

const getVentas = async (req, res) => {
  try {
    const data = await ventasService.getVentas();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getVentaById = async (req, res) => {
  try {
    const data = await ventasService.getVentaById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearVenta = async (req, res) => {
  try {
    const data = await ventasService.crearVenta(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const data = await ventasService.cambiarEstado(req.params.id, req.body.estado);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getVentas, getVentaById, crearVenta, cambiarEstado };