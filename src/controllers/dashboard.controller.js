// src/controllers/dashboard.controller.js
const dashboardService = require('../services/dashboard.service');

const getResumen = async (req, res) => {
  try {
    const data = await dashboardService.getResumen();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getResumen };