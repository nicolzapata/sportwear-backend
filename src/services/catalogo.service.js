// src/services/catalogo.service.js
const pool = require('../config/db');

const getCatalogo = async () => {
  const result = await pool.query(`
    SELECT
      c.id_catalogo, c.imagen_url, c.titulo,
      c.descripcion AS descripcion_catalogo,
      c.orden, c.es_principal,
      p.id_producto, p.nombre, p.descripcion, p.precio, p.talla, p.stock,
      cat.nombre AS categoria,
      col.nombre AS color
    FROM "Catalogo" c
    INNER JOIN "Productos"  p   ON c.id_producto  = p.id_producto
    LEFT  JOIN "Categorias" cat ON p.id_categoria = cat.id_categoria
    LEFT  JOIN "Colores"    col ON p.id_color     = col.id_color
    WHERE c.estado = 'Activo' AND p.publicado = true AND p.estado = 'Activo'
    ORDER BY c.orden ASC, c.fecha_creacion DESC
  `);
  return result.rows;
};

const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Catalogo"
    SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_catalogo = $1
    RETURNING id_catalogo, estado
  `, [id]);
  if (!result.rows[0]) throw { status: 404, message: 'Entrada no encontrada' };
  return result.rows[0];
};

module.exports = { getCatalogo, toggleEstado };