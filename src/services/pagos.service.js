// src/services/pagos.service.js
const pool = require('../config/db');

const getPagos = async () => {
  const result = await pool.query(`
    SELECT pa.*, v.id_cliente, c.nombre AS cliente, c.permiso_pagos, c.tipo_cliente
    FROM "PagosAbonos" pa
    JOIN "Ventas"   v ON pa.id_venta=v.id_venta
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    ORDER BY pa.id_pago DESC
  `);
  return result.rows;
};

const getPagoById = async (id) => {
  const result = await pool.query(`
    SELECT pa.*, c.nombre AS cliente, c.permiso_pagos
    FROM "PagosAbonos" pa
    JOIN "Ventas"   v ON pa.id_venta=v.id_venta
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE pa.id_pago=$1
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const crearPago = async (datos) => {
  const { id_venta, monto, tipo, metodo, referencia_pago, estado, fecha } = datos;
  if (!id_venta || !monto) throw { status: 400, message: 'id_venta y monto son requeridos' };

  const check = await pool.query(`
    SELECT c.permiso_pagos, c.nombre AS cliente
    FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE v.id_venta=$1
  `, [id_venta]);
  if (!check.rows.length) throw { status: 404, message: 'Venta no encontrada' };
  if (!check.rows[0].permiso_pagos)
    throw { status: 403, message: `El cliente "${check.rows[0].cliente}" tiene los pagos bloqueados.` };

  const result = await pool.query(`
    INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, referencia_pago, estado, fecha)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [id_venta, monto, tipo || 'Pago completo', metodo || 'Efectivo',
      referencia_pago || null, estado || 'Pendiente', fecha || new Date()]);
  return result.rows[0];
};

const cambiarEstado = async (id, estado) => {
  if (!estado) throw { status: 400, message: 'Estado requerido' };
  const result = await pool.query(
    `UPDATE "PagosAbonos" SET estado=$1 WHERE id_pago=$2 RETURNING *`,
    [estado, id]
  );
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getPagos, getPagoById, crearPago, cambiarEstado };