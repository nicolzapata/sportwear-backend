// src/controllers/barrios.controller.js
const pool = require("../config/db");

const getBarrios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_barrio, nombre, comuna, zona
       FROM "Barrios"
       ORDER BY comuna, nombre`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR BARRIOS:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getBarrios };