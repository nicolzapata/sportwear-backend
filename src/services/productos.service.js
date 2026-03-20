// src/services/productos.service.js
const pool = require('../config/db');

const getProductos = async (publicado) => {
  const whereClause = publicado !== undefined
    ? `WHERE p.publicado = ${publicado === '1' || publicado === 'true' ? 'true' : 'false'}`
    : '';

  const result = await pool.query(`
    SELECT
      p.id_producto, p.nombre, p.descripcion,
      p.id_categoria, p.id_color, p.precio, p.talla,
      p.publicado, p.estado, p.stock,
      c.nombre       AS categoria,
      col.nombre     AS color_nombre,
      col.codigo_hex AS codigo_hex,
      (SELECT url FROM "Imagenes"
       WHERE id_referencia=p.id_producto AND tipo_referencia='Producto'
         AND es_principal=true AND estado='Activo' LIMIT 1) AS imagen_principal
    FROM "Productos" p
    LEFT JOIN "Categorias" c   ON p.id_categoria = c.id_categoria
    LEFT JOIN "Colores"    col ON p.id_color      = col.id_color
    ${whereClause}
    ORDER BY p.fecha_creacion DESC
  `);
  return result.rows;
};

const crearProducto = async (datos) => {
  const { nombre, descripcion, id_categoria, id_color, precio, talla, publicado, estado, stock } = datos;
  if (!nombre) throw { status: 400, message: 'Nombre requerido' };

  const result = await pool.query(`
    INSERT INTO "Productos" (nombre, descripcion, id_categoria, id_color, precio, talla, publicado, estado, stock)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_producto, nombre
  `, [nombre, descripcion || null, id_categoria, id_color, precio || 0,
      talla || null, publicado || false, estado || 'Activo', stock ?? 0]);
  return result.rows[0];
};

const actualizarProducto = async (id, datos) => {
  const { nombre, descripcion, id_categoria, id_color, precio, talla, publicado, estado, stock } = datos;
  const result = await pool.query(`
    UPDATE "Productos" SET
      nombre       = COALESCE($1::VARCHAR,  nombre),
      descripcion  = COALESCE($2::TEXT,     descripcion),
      id_categoria = COALESCE($3::INTEGER,  id_categoria),
      id_color     = COALESCE($4::INTEGER,  id_color),
      precio       = COALESCE($5::NUMERIC,  precio),
      talla        = COALESCE($6::VARCHAR,  talla),
      publicado    = COALESCE($7::BOOLEAN,  publicado),
      estado       = COALESCE($8::VARCHAR,  estado),
      stock        = COALESCE($9::INTEGER,  stock)
    WHERE id_producto = $10 RETURNING id_producto, nombre
  `, [nombre || null, descripcion || null, id_categoria || null, id_color || null,
      precio || null, talla || null, publicado ?? null, estado || null, stock ?? null, id]);
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Productos"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_producto=$1 RETURNING id_producto, estado
  `, [id]);
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const togglePublicar = async (id) => {
  const result = await pool.query(`
    UPDATE "Productos" SET publicado = NOT publicado
    WHERE id_producto=$1 RETURNING id_producto, publicado
  `, [id]);
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar };