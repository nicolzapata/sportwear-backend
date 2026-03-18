// src/controllers/compras.controller.js
const pool = require('../config/db');

const getCompras = async (req, res) => {
  try {
    const cab = await pool.query(`
      SELECT c.*, p.razon_social AS proveedor, p.nombre_comercial
      FROM "Compras" c
      JOIN "Proveedores" p ON c.id_proveedor = p.id_proveedor
      ORDER BY c.id_compra DESC
    `);
    const ids = cab.rows.map(c => c.id_compra);
    let detalles = [];
    if (ids.length) {
      const det = await pool.query(`
        SELECT dc.*, pr.nombre AS producto, pr.talla
        FROM "DetalleCompra" dc
        JOIN "Productos" pr ON dc.id_producto = pr.id_producto
        WHERE dc.id_compra = ANY($1::int[])
      `, [ids]);
      detalles = det.rows;
    }
    res.json(cab.rows.map(c => ({ ...c, items: detalles.filter(d => d.id_compra === c.id_compra) })));
  } catch (err) {
    console.error('ERROR getCompras:', err);
    res.status(500).json({ message: err.message });
  }
};

const getCompraById = async (req, res) => {
  try {
    const cab = await pool.query(`
      SELECT c.*, p.razon_social AS proveedor
      FROM "Compras" c
      JOIN "Proveedores" p ON c.id_proveedor = p.id_proveedor
      WHERE c.id_compra = $1
    `, [req.params.id]);
    if (!cab.rows.length) return res.status(404).json({ message: 'No encontrada' });
    const det = await pool.query(`
      SELECT dc.*, pr.nombre AS producto, pr.talla
      FROM "DetalleCompra" dc
      JOIN "Productos" pr ON dc.id_producto = pr.id_producto
      WHERE dc.id_compra = $1
    `, [req.params.id]);
    res.json({ ...cab.rows[0], items: det.rows });
  } catch (err) {
    console.error('ERROR getCompraById:', err);
    res.status(500).json({ message: err.message });
  }
};

const crearCompra = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id_proveedor, numero_orden, descuento, impuesto, estado, fecha, observaciones, items } = req.body;
    if (!items || !items.length)
      return res.status(400).json({ message: 'Debe incluir al menos un producto' });
    if (!id_proveedor)
      return res.status(400).json({ message: 'El proveedor es requerido' });

    const subtotal = items.reduce((a, i) => a + i.cantidad * i.precio_unitario - (i.descuento_linea || 0), 0);
    const total    = subtotal - (descuento || 0) + (impuesto || 0);

    await client.query('BEGIN');
    const compra = await client.query(`
      INSERT INTO "Compras"
        (id_proveedor, numero_orden, subtotal, descuento, impuesto, total, estado, fecha, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [id_proveedor, numero_orden||null, subtotal, descuento||0, impuesto||0, total,
        estado||'Pendiente', fecha||new Date(), observaciones||null]);

    const id_compra = compra.rows[0].id_compra;
    for (const item of items) {
      await client.query(`
        INSERT INTO "DetalleCompra" (id_compra, id_producto, cantidad, precio_unitario, descuento_linea)
        VALUES ($1,$2,$3,$4,$5)
      `, [id_compra, item.id_producto, item.cantidad, item.precio_unitario, item.descuento_linea||0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ ...compra.rows[0], items });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR crearCompra:', err);
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};

const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ message: 'Estado requerido' });
    const result = await pool.query(
      `UPDATE "Compras" SET estado=$1 WHERE id_compra=$2 RETURNING *`,
      [estado, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'No encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR cambiarEstado compra:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCompras, getCompraById, crearCompra, cambiarEstado };
