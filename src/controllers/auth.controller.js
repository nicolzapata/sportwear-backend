// src/controllers/auth.controller.js
const pool = require('../config/db');
const jwt  = require('jsonwebtoken');

const generarToken = (usuario) => {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre:     usuario.nombre,
      email:      usuario.email,
      rol:        usuario.rol,
      id_cliente: usuario.id_cliente || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

// ─────────────────────────────────────────
// LOGIN — POST /api/auth/login
// ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena)
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });

    const baseResult = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.estado,
              u.intentos_fallidos, u.bloqueado_hasta, u.id_cliente,
              r.nombre AS rol
       FROM "Usuarios" u
       INNER JOIN "Roles" r ON u.id_rol = r.id_rol
       WHERE u.email = $1`,
      [email]
    );
    const base = baseResult.rows[0];

    if (!base)
      return res.status(401).json({ message: 'Credenciales incorrectas' });

    if (base.bloqueado_hasta && new Date(base.bloqueado_hasta) > new Date())
      return res.status(403).json({ message: 'Usuario bloqueado temporalmente. Intenta más tarde.' });

    if (base.estado !== 'Activo')
      return res.status(403).json({ message: 'Usuario inactivo. Contacta al administrador.' });

    const authResult = await pool.query(
      `SELECT id_usuario FROM "Usuarios"
       WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email, contrasena]
    );

    if (!authResult.rows[0]) {
      await pool.query(
        `UPDATE "Usuarios" SET intentos_fallidos = intentos_fallidos + 1 WHERE id_usuario = $1`,
        [base.id_usuario]
      );
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    await pool.query(
      `UPDATE "Usuarios" SET intentos_fallidos = 0, ultimo_acceso = NOW() WHERE id_usuario = $1`,
      [base.id_usuario]
    );

    const token = generarToken(base);

    res.json({
      ok: true,
      token,
      usuario: {
        id_usuario: base.id_usuario,
        nombre:     base.nombre,
        email:      base.email,
        rol:        base.rol,
        estado:     base.estado,
        id_cliente: base.id_cliente,
      },
    });

  } catch (err) {
    console.error('ERROR LOGIN:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─────────────────────────────────────────
// REGISTRO PÚBLICO — POST /api/auth/registro
// ─────────────────────────────────────────
const registro = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, email, contrasena, telefono, documento, tipo_doc, ciudad, direccion, id_barrio } = req.body;

    if (!nombre || !email || !contrasena || !documento)
      return res.status(400).json({ message: 'Nombre, email, contraseña y documento son requeridos' });

    const emailExiste = await client.query(`SELECT id_usuario FROM "Usuarios" WHERE email = $1`, [email]);
    if (emailExiste.rows.length > 0)
      return res.status(409).json({ message: 'El email ya está registrado' });

    const docExiste = await client.query(`SELECT id_cliente FROM "Clientes" WHERE documento = $1`, [documento]);
    if (docExiste.rows.length > 0)
      return res.status(409).json({ message: 'El documento ya está registrado' });

    await client.query('BEGIN');

    const nuevoCliente = await client.query(
      `INSERT INTO "Clientes" (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_cliente`,
      [nombre, tipo_doc||'CC', documento, telefono||null, email, ciudad||'Medellín', id_barrio||null, direccion||null]
    );
    const id_cliente = nuevoCliente.rows[0].id_cliente;

    const nuevoUsuario = await client.query(
      `INSERT INTO "Usuarios" (nombre, email, password_hash, id_rol, id_cliente)
       VALUES ($1, $2, crypt($3, gen_salt('bf',12)), 2, $4)
       RETURNING id_usuario, nombre, email`,
      [nombre, email, contrasena, id_cliente]
    );

    await client.query('COMMIT');

    const token = generarToken({ ...nuevoUsuario.rows[0], rol: 'Cliente', id_cliente });

    res.status(201).json({
      ok: true,
      message: 'Registro exitoso',
      token,
      usuario: nuevoUsuario.rows[0],
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR REGISTRO:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────
// CREAR USUARIO ADMIN — POST /api/usuarios
// ─────────────────────────────────────────
const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, contrasena, id_rol } = req.body;

    if (!nombre || !email || !contrasena || !id_rol)
      return res.status(400).json({ message: 'Nombre, email, contraseña y rol son requeridos' });

    const emailExiste = await pool.query(`SELECT id_usuario FROM "Usuarios" WHERE email = $1`, [email]);
    if (emailExiste.rows.length > 0)
      return res.status(409).json({ message: 'El email ya está registrado' });

    const result = await pool.query(
      `INSERT INTO "Usuarios" (nombre, email, password_hash, id_rol)
       VALUES ($1, $2, crypt($3, gen_salt('bf',12)), $4)
       RETURNING id_usuario, nombre, email`,
      [nombre, email, contrasena, id_rol]
    );

    res.status(201).json({ ok: true, message: 'Usuario creado correctamente', usuario: result.rows[0] });

  } catch (err) {
    console.error('ERROR CREAR USUARIO:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─────────────────────────────────────────
// ACTUALIZAR USUARIO — PUT /api/usuarios/:id
// Actualiza Usuarios + Clientes en transacción
// Solo el propio usuario puede cambiar su contraseña
// ─────────────────────────────────────────
const actualizarUsuario = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      nombre, email, id_rol, estado, contrasena,
      tipo_doc, documento, telefono, ciudad, id_barrio, direccion
    } = req.body;

    if (!nombre || !email || !id_rol)
      return res.status(400).json({ message: 'Nombre, email y rol son requeridos' });

    await client.query('BEGIN');

    // 1. Verificar que existe y obtener id_cliente
    const usuarioActual = await client.query(
      `SELECT id_usuario, id_cliente FROM "Usuarios" WHERE id_usuario = $1`,
      [id]
    );
    if (!usuarioActual.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const { id_cliente } = usuarioActual.rows[0];

    // 2. Actualizar Usuarios
    // Contraseña: solo si la envían Y es el propio usuario quien edita
    const esPropioUsuario = String(req.usuario.id_usuario) === String(id);

    if (contrasena && esPropioUsuario) {
      await client.query(
        `UPDATE "Usuarios"
         SET nombre = $1, email = $2, id_rol = $3, estado = $4,
             password_hash = crypt($5, gen_salt('bf', 12))
         WHERE id_usuario = $6`,
        [nombre, email, id_rol, estado, contrasena, id]
      );
    } else {
      await client.query(
        `UPDATE "Usuarios"
         SET nombre = $1, email = $2, id_rol = $3, estado = $4
         WHERE id_usuario = $5`,
        [nombre, email, id_rol, estado, id]
      );
    }

    // 3. Actualizar Clientes si ya tiene registro
    if (id_cliente) {
      await client.query(
        `UPDATE "Clientes"
         SET nombre = $1, tipo_doc = $2, documento = $3,
             telefono = $4, ciudad = $5, id_barrio = $6, direccion = $7
         WHERE id_cliente = $8`,
        [
          nombre,
          tipo_doc  || 'CC',
          documento || null,
          telefono  || null,
          ciudad    || 'Medellín',
          id_barrio || null,
          direccion || null,
          id_cliente
        ]
      );
    } else if (documento) {
      // No tiene cliente aún pero envió documento — crear y vincular
      const nuevoCliente = await client.query(
        `INSERT INTO "Clientes" (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_cliente`,
        [
          nombre,
          tipo_doc  || 'CC',
          documento,
          telefono  || null,
          email,
          ciudad    || 'Medellín',
          id_barrio || null,
          direccion || null
        ]
      );
      await client.query(
        `UPDATE "Usuarios" SET id_cliente = $1 WHERE id_usuario = $2`,
        [nuevoCliente.rows[0].id_cliente, id]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, message: 'Usuario actualizado correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR ACTUALIZAR USUARIO:', err);
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};

// ─────────────────────────────────────────
// PERFIL — GET /api/auth/perfil  (protegida)
// ─────────────────────────────────────────
const perfil = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.estado,
              u.ultimo_acceso, u.fecha_creacion, u.id_cliente,
              r.nombre AS rol
       FROM "Usuarios" u
       JOIN "Roles" r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = $1`,
      [req.usuario.id_usuario]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR PERFIL:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { login, registro, crearUsuario, actualizarUsuario, perfil };