// src/services/productos.service.js
const pool = require('../config/db');

// ── Helper: sincroniza Catalogo cuando un producto se publica/despublica ──
const sincronizarCatalogo = async (client, id_producto, publicado, nombre, descripcion) => {
  if (publicado) {
    const existe = await client.query(
      `SELECT id_catalogo FROM "Catalogo" WHERE id_producto = $1`, [id_producto]
    );
    if (!existe.rows.length) {
      await client.query(
        `INSERT INTO "Catalogo" (id_producto, titulo, descripcion, orden, es_principal, estado)
         VALUES ($1, $2, $3,
           (SELECT COALESCE(MAX(orden), 0) + 1 FROM "Catalogo"),
           false, 'Activo')`,
        [id_producto, nombre, descripcion || null]
      );
    } else {
      await client.query(
        `UPDATE "Catalogo" SET estado = 'Activo' WHERE id_producto = $1`, [id_producto]
      );
    }
  } else {
    await client.query(
      `UPDATE "Catalogo" SET estado = 'Inactivo' WHERE id_producto = $1`, [id_producto]
    );
  }
};

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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO "Productos" (nombre, descripcion, id_categoria, id_color, precio, talla, publicado, estado, stock)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_producto, nombre, descripcion, publicado
    `, [nombre, descripcion || null, id_categoria, id_color, precio || 0,
        talla || null, publicado || false, estado || 'Activo', stock ?? 0]);

    const producto = result.rows[0];
    if (producto.publicado) {
      await sincronizarCatalogo(client, producto.id_producto, true, producto.nombre, producto.descripcion);
    }
    await client.query('COMMIT');
    return { id_producto: producto.id_producto, nombre: producto.nombre };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const actualizarProducto = async (id, datos) => {
  const { nombre, descripcion, id_categoria, id_color, precio, talla, publicado, estado, stock } = datos;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
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
      WHERE id_producto = $10
      RETURNING id_producto, nombre, descripcion, publicado
    `, [nombre || null, descripcion || null, id_categoria || null, id_color || null,
        precio || null, talla || null, publicado ?? null, estado || null, stock ?? null, id]);

    if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
    const producto = result.rows[0];

    if (publicado !== null && publicado !== undefined) {
      await sincronizarCatalogo(client, producto.id_producto, producto.publicado, producto.nombre, producto.descripcion);
    }
    await client.query('COMMIT');
    return { id_producto: producto.id_producto, nombre: producto.nombre };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE "Productos" SET publicado = NOT publicado
      WHERE id_producto=$1 RETURNING id_producto, nombre, descripcion, publicado
    `, [id]);
    if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };

    const producto = result.rows[0];
    await sincronizarCatalogo(client, producto.id_producto, producto.publicado, producto.nombre, producto.descripcion);

    await client.query('COMMIT');
    return { id_producto: producto.id_producto, publicado: producto.publicado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar };