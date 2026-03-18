// src/controllers/clientes.controller.js
const pool = require('../config/db');

const getClientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
      FROM "Clientes" cl
      LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
      ORDER BY cl.id_cliente DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('ERROR getClientes:', err);
    res.status(500).json({ message: err.message });
  }
};

const getClienteById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
      FROM "Clientes" cl
      LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
      WHERE cl.id_cliente = $1
    `, [req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR getClienteById:', err);
    res.status(500).json({ message: err.message });
  }
};

const crearCliente = async (req, res) => {
  try {
    const { nombre, tipo_doc, documento, telefono, email,
            id_barrio, direccion, tipo_cliente, permiso_pagos, estado } = req.body;
    if (!nombre || !documento)
      return res.status(400).json({ message: 'Nombre y documento son requeridos' });

    const result = await pool.query(`
      INSERT INTO "Clientes"
        (nombre, tipo_doc, documento, telefono, email,
         ciudad, id_barrio, direccion, tipo_cliente, permiso_pagos, estado)
      VALUES ($1,$2,$3,$4,$5,'Medellín',$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      nombre,
      tipo_doc      || 'CC',
      documento,
      telefono      || null,
      email         || null,
      id_barrio     || null,
      direccion     || null,
      tipo_cliente  || 'Regular',
      permiso_pagos !== undefined ? permiso_pagos : true,
      estado        || 'Activo',
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('ERROR crearCliente:', err);
    res.status(500).json({ message: err.message });
  }
};

const actualizarCliente = async (req, res) => {
  try {
    const { nombre, tipo_doc, documento, telefono, email,
            id_barrio, direccion, tipo_cliente, permiso_pagos, estado } = req.body;
    const result = await pool.query(`
      UPDATE "Clientes" SET
        nombre        = COALESCE($1,  nombre),
        tipo_doc      = COALESCE($2,  tipo_doc),
        documento     = COALESCE($3,  documento),
        telefono      = COALESCE($4,  telefono),
        email         = COALESCE($5,  email),
        id_barrio     = COALESCE($6,  id_barrio),
        direccion     = COALESCE($7,  direccion),
        tipo_cliente  = COALESCE($8,  tipo_cliente),
        permiso_pagos = COALESCE($9,  permiso_pagos),
        estado        = COALESCE($10, estado)
      WHERE id_cliente = $11
      RETURNING *
    `, [nombre, tipo_doc, documento, telefono, email,
        id_barrio, direccion, tipo_cliente, permiso_pagos, estado, req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR actualizarCliente:', err);
    res.status(500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE "Clientes"
      SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
      WHERE id_cliente = $1
      RETURNING id_cliente, estado
    `, [req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ message: 'No encontrado' });
    res.json({ ok: true, ...result.rows[0] });
  } catch (err) {
    console.error('ERROR toggleEstado cliente:', err);
    res.status(500).json({ message: err.message });
  }
};

const togglePermisoPagos = async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE "Clientes"
      SET permiso_pagos = NOT permiso_pagos
      WHERE id_cliente = $1
      RETURNING id_cliente, permiso_pagos
    `, [req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ message: 'No encontrado' });
    res.json({ ok: true, ...result.rows[0] });
  } catch (err) {
    console.error('ERROR togglePermisoPagos:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getClientes, getClienteById, crearCliente, actualizarCliente, toggleEstado, togglePermisoPagos };
