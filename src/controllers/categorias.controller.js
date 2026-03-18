// src/controllers/categorias.controller.js
const pool = require("../config/db");

const getCategorias = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_categoria, nombre, descripcion, estado
       FROM "Categorias"
       WHERE estado = 'Activo'
       ORDER BY nombre`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR CATEGORIAS:", err);
    res.status(500).json({ message: err.message });
  }
};

const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ message: "Nombre requerido" });
    const result = await pool.query(
      `INSERT INTO "Categorias" (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, descripcion || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ERROR CREAR CATEGORIA:", err);
    res.status(500).json({ message: err.message });
  }
};

const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;
    const result = await pool.query(
      `UPDATE "Categorias"
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           estado = COALESCE($3, estado)
       WHERE id_categoria = $4
       RETURNING *`,
      [nombre, descripcion, estado, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "No encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("ERROR ACTUALIZAR CATEGORIA:", err);
    res.status(500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE "Categorias"
       SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
       WHERE id_categoria = $1
       RETURNING id_categoria, estado`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "No encontrada" });
    res.json({ ok: true, ...result.rows[0] });
  } catch (err) {
    console.error("ERROR TOGGLE CATEGORIA:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCategorias, crearCategoria, actualizarCategoria, toggleEstado };