// src/services/ventas.service.js
const pool = require('../config/db');

const getVentas = async () => {
  const cab = await pool.query(`
    SELECT v.*, c.nombre AS cliente, c.tipo_cliente, c.permiso_pagos, c.email AS cliente_email
    FROM "Ventas" v
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    ORDER BY v.id_venta DESC
  `);
  const ids = cab.rows.map(v => v.id_venta);
  let detalles = [];
  if (ids.length) {
    const det = await pool.query(`
      SELECT dv.*, p.nombre AS producto, p.talla
      FROM "DetalleVenta" dv
      JOIN "Productos" p ON dv.id_producto=p.id_producto
      WHERE dv.id_venta=ANY($1::int[])
    `, [ids]);
    detalles = det.rows;
  }
  return cab.rows.map(v => ({ ...v, items: detalles.filter(d => d.id_venta === v.id_venta) }));
};

const getVentaById = async (id) => {
  const cab = await pool.query(`
    SELECT v.*, c.nombre AS cliente, c.permiso_pagos
    FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE v.id_venta=$1
  `, [id]);
  if (!cab.rows.length) throw { status: 404, message: 'No encontrada' };
  const det = await pool.query(`
    SELECT dv.*, p.nombre AS producto, p.talla
    FROM "DetalleVenta" dv JOIN "Productos" p ON dv.id_producto=p.id_producto
    WHERE dv.id_venta=$1
  `, [id]);
  return { ...cab.rows[0], items: det.rows };
};

const crearVenta = async (datos) => {
  const { id_cliente, descuento, impuesto, estado, fecha, observaciones, items } = datos;
  if (!items || !items.length) throw { status: 400, message: 'Debe incluir al menos un producto' };
  if (!id_cliente) throw { status: 400, message: 'El cliente es requerido' };

  const subtotal = items.reduce((a, i) => a + i.cantidad * i.precio_unitario - (i.descuento_linea || 0), 0);
  const total    = subtotal - (descuento || 0) + (impuesto || 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const venta = await client.query(`
      INSERT INTO "Ventas" (id_cliente, subtotal, descuento, impuesto, total, estado, fecha, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [id_cliente, subtotal, descuento || 0, impuesto || 0, total,
        estado || 'Pendiente', fecha || new Date(), observaciones || null]);

    const id_venta = venta.rows[0].id_venta;
    for (const item of items) {
      const stockRes = await client.query(`SELECT stock FROM "Productos" WHERE id_producto=$1`, [item.id_producto]);
      const stock = stockRes.rows[0]?.stock ?? 0;
      if (stock < item.cantidad) {
        await client.query('ROLLBACK');
        throw { status: 400, message: `Stock insuficiente para producto ID ${item.id_producto}. Disponible: ${stock}` };
      }
      await client.query(`
        INSERT INTO "DetalleVenta" (id_venta, id_producto, cantidad, precio_unitario, descuento_linea)
        VALUES ($1,$2,$3,$4,$5)
      `, [id_venta, item.id_producto, item.cantidad, item.precio_unitario, item.descuento_linea || 0]);
      await client.query(`UPDATE "Productos" SET stock=stock-$1 WHERE id_producto=$2`, [item.cantidad, item.id_producto]);
    }
    await client.query('COMMIT');
    return { ...venta.rows[0], items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const cambiarEstado = async (id, estado) => {
  if (!estado) throw { status: 400, message: 'Estado requerido' };
  const result = await pool.query(
    `UPDATE "Ventas" SET estado=$1 WHERE id_venta=$2 RETURNING *`,
    [estado, id]
  );
  if (!result.rows.length) throw { status: 404, message: 'No encontrada' };
  return result.rows[0];
};

module.exports = { getVentas, getVentaById, crearVenta, cambiarEstado };