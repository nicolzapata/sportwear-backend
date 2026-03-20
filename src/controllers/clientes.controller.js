// src/controllers/clientes.controller.js
const clientesService = require('../services/clientes.service');

const getClientes = async (req, res) => {
  try {
    const data = await clientesService.getClientes();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getClienteById = async (req, res) => {
  try {
    const data = await clientesService.getClienteById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearCliente = async (req, res) => {
  try {
    const data = await clientesService.crearCliente(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarCliente = async (req, res) => {
  try {
    const data = await clientesService.actualizarCliente(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await clientesService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const togglePermisoPagos = async (req, res) => {
  try {
    const data = await clientesService.togglePermisoPagos(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getClientes, getClienteById, crearCliente, actualizarCliente, toggleEstado, togglePermisoPagos };