// src/controllers/proveedores.controller.js
const pool = require('../config/db');

const getProveedores = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "Proveedores" ORDER BY id_proveedor DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('ERROR getProveedores:', err);
    res.status(500).json({ message: err.message });
  }
};

const getProveedorById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "Proveedores" WHERE id_proveedor = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR getProveedorById:', err);
    res.status(500).json({ message: err.message });
  }
};

const crearProveedor = async (req, res) => {
  try {
    const {
      tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
      nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
      nombre_contacto2, telefono_contacto2, email_contacto2,
      ciudad, departamento, pais, direccion,
      banco, tipo_cuenta, numero_cuenta, titular_cuenta,
      plazo_pago_dias, condiciones, estado
    } = req.body;

    if (!razon_social || !numero_doc)
      return res.status(400).json({ message: 'Razón social y número de documento son requeridos' });

    const result = await pool.query(`
      INSERT INTO "Proveedores" (
        tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
        nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
        nombre_contacto2, telefono_contacto2, email_contacto2,
        ciudad, departamento, pais, direccion,
        banco, tipo_cuenta, numero_cuenta, titular_cuenta,
        plazo_pago_dias, condiciones, estado
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *
    `, [
      tipo_doc, numero_doc, digito_verificacion||null, razon_social, nombre_comercial||null,
      nombre_contacto, cargo_contacto||null, telefono_fijo||null, telefono_celular||null, email_contacto||null,
      nombre_contacto2||null, telefono_contacto2||null, email_contacto2||null,
      ciudad, departamento||null, pais||'Colombia', direccion||null,
      banco||null, tipo_cuenta||null, numero_cuenta||null, titular_cuenta||null,
      plazo_pago_dias||30, condiciones||null, estado||'Activo'
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('ERROR crearProveedor:', err);
    res.status(500).json({ message: err.message });
  }
};

const actualizarProveedor = async (req, res) => {
  try {
    const {
      tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
      nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
      nombre_contacto2, telefono_contacto2, email_contacto2,
      ciudad, departamento, pais, direccion,
      banco, tipo_cuenta, numero_cuenta, titular_cuenta,
      plazo_pago_dias, condiciones, estado
    } = req.body;

    const result = await pool.query(`
      UPDATE "Proveedores" SET
        tipo_doc            = COALESCE($1,  tipo_doc),
        numero_doc          = COALESCE($2,  numero_doc),
        digito_verificacion = COALESCE($3,  digito_verificacion),
        razon_social        = COALESCE($4,  razon_social),
        nombre_comercial    = COALESCE($5,  nombre_comercial),
        nombre_contacto     = COALESCE($6,  nombre_contacto),
        cargo_contacto      = COALESCE($7,  cargo_contacto),
        telefono_fijo       = COALESCE($8,  telefono_fijo),
        telefono_celular    = COALESCE($9,  telefono_celular),
        email_contacto      = COALESCE($10, email_contacto),
        nombre_contacto2    = COALESCE($11, nombre_contacto2),
        telefono_contacto2  = COALESCE($12, telefono_contacto2),
        email_contacto2     = COALESCE($13, email_contacto2),
        ciudad              = COALESCE($14, ciudad),
        departamento        = COALESCE($15, departamento),
        pais                = COALESCE($16, pais),
        direccion           = COALESCE($17, direccion),
        banco               = COALESCE($18, banco),
        tipo_cuenta         = COALESCE($19, tipo_cuenta),
        numero_cuenta       = COALESCE($20, numero_cuenta),
        titular_cuenta      = COALESCE($21, titular_cuenta),
        plazo_pago_dias     = COALESCE($22, plazo_pago_dias),
        condiciones         = COALESCE($23, condiciones),
        estado              = COALESCE($24, estado)
      WHERE id_proveedor = $25
      RETURNING *
    `, [
      tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
      nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
      nombre_contacto2, telefono_contacto2, email_contacto2,
      ciudad, departamento, pais, direccion,
      banco, tipo_cuenta, numero_cuenta, titular_cuenta,
      plazo_pago_dias, condiciones, estado,
      req.params.id
    ]);
    if (!result.rows.length) return res.status(404).json({ message: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR actualizarProveedor:', err);
    res.status(500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE "Proveedores"
      SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
      WHERE id_proveedor = $1
      RETURNING id_proveedor, estado
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'No encontrado' });
    res.json({ ok: true, ...result.rows[0] });
  } catch (err) {
    console.error('ERROR toggleEstado proveedor:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProveedores, getProveedorById, crearProveedor, actualizarProveedor, toggleEstado };
