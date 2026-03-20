// src/services/barrios.service.js
const pool = require('../config/db');

const getBarrios = async () => {
  const result = await pool.query(
    `SELECT id_barrio, nombre, comuna, zona
     FROM "Barrios"
     ORDER BY comuna, nombre`
  );
  return result.rows;
};

module.exports = { getBarrios };