// src/services/clientes.service.js
const pool = require('../config/db');

const getClientes = async () => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    ORDER BY cl.id_cliente DESC
  `);
  return result.rows;
};

const getClienteById = async (id) => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    WHERE cl.id_cliente = $1
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};

const crearCliente = async (datos) => {
  const { nombre, tipo_doc, documento, telefono, email, id_barrio, direccion, tipo_cliente, permiso_pagos, estado } = datos;
  if (!nombre || !documento) throw { status: 400, message: 'Nombre y documento son requeridos' };

  const result = await pool.query(`
    INSERT INTO "Clientes"
      (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion, tipo_cliente, permiso_pagos, estado)
    VALUES ($1,$2,$3,$4,$5,'Medellín',$6,$7,$8,$9,$10) RETURNING *
  `, [
    nombre, tipo_doc || 'CC', documento, telefono || null, email || null,
    id_barrio || null, direccion || null, tipo_cliente || 'Regular',
    permiso_pagos !== undefined ? permiso_pagos : true, estado || 'Activo',
  ]);
  return result.rows[0];
};

const actualizarCliente = async (id, datos) => {
  const { nombre, tipo_doc, documento, telefono, email, id_barrio, direccion, tipo_cliente, permiso_pagos, estado } = datos;
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
    WHERE id_cliente = $11 RETURNING *
  `, [nombre, tipo_doc, documento, telefono, email, id_barrio, direccion, tipo_cliente, permiso_pagos, estado, id]);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Clientes"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_cliente = $1 RETURNING id_cliente, estado
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const togglePermisoPagos = async (id) => {
  const result = await pool.query(`
    UPDATE "Clientes" SET permiso_pagos = NOT permiso_pagos
    WHERE id_cliente = $1 RETURNING id_cliente, permiso_pagos
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getClientes, getClienteById, crearCliente, actualizarCliente, toggleEstado, togglePermisoPagos };