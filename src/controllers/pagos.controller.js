// src/controllers/pagos.controller.js
const pool = require('../config/db');

const getPagos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pa.*, v.id_cliente, c.nombre AS cliente, c.permiso_pagos, c.tipo_cliente
      FROM "PagosAbonos" pa
      JOIN "Ventas"   v ON pa.id_venta=v.id_venta
      JOIN "Clientes" c ON v.id_cliente=c.id_cliente
      ORDER BY pa.id_pago DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('ERROR getPagos:', err);
    res.status(500).json({ message: err.message });
  }
};

const getPagoById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pa.*, c.nombre AS cliente, c.permiso_pagos
      FROM "PagosAbonos" pa
      JOIN "Ventas"   v ON pa.id_venta=v.id_venta
      JOIN "Clientes" c ON v.id_cliente=c.id_cliente
      WHERE pa.id_pago=$1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR getPagoById:', err);
    res.status(500).json({ message: err.message });
  }
};

const crearPago = async (req, res) => {
  try {
    const { id_venta, monto, tipo, metodo, referencia_pago, estado, fecha } = req.body;
    if (!id_venta || !monto)
      return res.status(400).json({ message: 'id_venta y monto son requeridos' });

    const check = await pool.query(`
      SELECT c.permiso_pagos, c.nombre AS cliente
      FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente=c.id_cliente
      WHERE v.id_venta=$1
    `, [id_venta]);
    if (!check.rows.length) return res.status(404).json({ message: 'Venta no encontrada' });
    if (!check.rows[0].permiso_pagos)
      return res.status(403).json({ message: `El cliente "${check.rows[0].cliente}" tiene los pagos bloqueados.` });

    const result = await pool.query(`
      INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, referencia_pago, estado, fecha)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [id_venta, monto, tipo||'Pago completo', metodo||'Efectivo',
        referencia_pago||null, estado||'Pendiente', fecha||new Date()]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('ERROR crearPago:', err);
    res.status(500).json({ message: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ message: 'Estado requerido' });
    const result = await pool.query(
      `UPDATE "PagosAbonos" SET estado=$1 WHERE id_pago=$2 RETURNING *`,
      [estado, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR cambiarEstado pago:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPagos, getPagoById, crearPago, cambiarEstado };
