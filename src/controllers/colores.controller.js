// src/controllers/colores.controller.js
const pool = require("../config/db");

const getColores = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_color, nombre, codigo_hex, estado
       FROM "Colores"
       WHERE estado = 'Activo'
       ORDER BY nombre`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR COLORES:", err);
    res.status(500).json({ message: err.message });
  }
};

const crearColor = async (req, res) => {
  try {
    const { nombre, codigo_hex } = req.body;
    if (!nombre) return res.status(400).json({ message: "Nombre requerido" });
    const result = await pool.query(
      `INSERT INTO "Colores" (nombre, codigo_hex)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, codigo_hex || "#000000"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ERROR CREAR COLOR:", err);
    res.status(500).json({ message: err.message });
  }
};

const actualizarColor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo_hex, estado } = req.body;
    const result = await pool.query(
      `UPDATE "Colores"
       SET nombre     = COALESCE($1, nombre),
           codigo_hex = COALESCE($2, codigo_hex),
           estado     = COALESCE($3, estado)
       WHERE id_color = $4
       RETURNING *`,
      [nombre, codigo_hex, estado, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "No encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("ERROR ACTUALIZAR COLOR:", err);
    res.status(500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE "Colores"
       SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
       WHERE id_color = $1
       RETURNING id_color, estado`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "No encontrado" });
    res.json({ ok: true, ...result.rows[0] });
  } catch (err) {
    console.error("ERROR TOGGLE COLOR:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getColores, crearColor, actualizarColor, toggleEstado };