// src/controllers/usuario.controller.js

const usuarioModel = require('../models/usuario.model');
const bcrypt       = require('bcrypt');   // opcional si usas pgcrypto en el modelo

const MAX_INTENTOS   = 5;
const BLOQUEO_MINUTOS = 30;

// ─────────────────────────────────────────────
// GET /usuarios
// Lista todos los usuarios con su rol
// ─────────────────────────────────────────────
async function listar(req, res) {
  try {
    const usuarios = await usuarioModel.findAllConRol();
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('[listar usuarios]', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener usuarios' });
  }
}

// ─────────────────────────────────────────────
// GET /usuarios/:id
// Obtiene un usuario por su PK
// ─────────────────────────────────────────────
async function obtener(req, res) {
  try {
    const { id } = req.params;
    const usuario = await usuarioModel.findById(id);

    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    // No exponer el hash
    delete usuario.password_hash;
    res.json({ ok: true, data: usuario });
  } catch (err) {
    console.error('[obtener usuario]', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener usuario' });
  }
}

// ─────────────────────────────────────────────
// POST /usuarios
// Crea un nuevo usuario
// ─────────────────────────────────────────────
async function crear(req, res) {
  try {
    const { nombre, email, password, id_rol, id_cliente, estado = 'activo' } = req.body;

    if (!nombre || !email || !password || !id_rol) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Campos requeridos: nombre, email, password, id_rol'
      });
    }

    // Verifica que el email no exista
    const existe = await usuarioModel.findByEmail(email);
    if (existe) {
      return res.status(409).json({ ok: false, mensaje: 'El email ya está registrado' });
    }

    // El hash lo hace pgcrypto en la BD; si prefieres Node:
    // const password_hash = await bcrypt.hash(password, 10);
    // y ajusta la columna en el INSERT.

    const nuevo = await usuarioModel.create({
      nombre,
      email,
      password_hash: password, // pgcrypto lo hashea vía trigger o DEFAULT
      id_rol,
      id_cliente: id_cliente || null,
      estado,
      intentos_fallidos: 0,
      fecha_creacion: new Date()
    });

    delete nuevo.password_hash;
    res.status(201).json({ ok: true, data: nuevo });
  } catch (err) {
    console.error('[crear usuario]', err);
    res.status(500).json({ ok: false, mensaje: 'Error al crear usuario' });
  }
}

// ─────────────────────────────────────────────
// PUT /usuarios/:id
// Actualiza datos de un usuario (sin contraseña)
// ─────────────────────────────────────────────
async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { nombre, email, id_rol, id_cliente, estado } = req.body;

    const existe = await usuarioModel.findById(id);
    if (!existe) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    // Si cambia el email, verificar unicidad
    if (email && email !== existe.email) {
      const emailEnUso = await usuarioModel.findByEmail(email);
      if (emailEnUso) {
        return res.status(409).json({ ok: false, mensaje: 'El email ya está en uso' });
      }
    }

    const actualizado = await usuarioModel.update(id, {
      ...(nombre      && { nombre }),
      ...(email       && { email }),
      ...(id_rol      && { id_rol }),
      ...(id_cliente  !== undefined && { id_cliente }),
      ...(estado      && { estado })
    });

    delete actualizado.password_hash;
    res.json({ ok: true, data: actualizado });
  } catch (err) {
    console.error('[actualizar usuario]', err);
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar usuario' });
  }
}

// ─────────────────────────────────────────────
// PATCH /usuarios/:id/password
// Cambia la contraseña de un usuario
// ─────────────────────────────────────────────
async function cambiarPassword(req, res) {
  try {
    const { id } = req.params;
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Se requieren password_actual y password_nueva'
      });
    }

    const usuario = await usuarioModel.findById(id);
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    // Verifica contraseña actual con pgcrypto
    const valido = await usuarioModel.verificarPassword(usuario.email, password_actual);
    if (!valido) {
      return res.status(401).json({ ok: false, mensaje: 'Contraseña actual incorrecta' });
    }

    // Actualiza — pgcrypto hashea en la BD mediante crypt($1, gen_salt('bf'))
    await usuarioModel.update(id, { password_hash: password_nueva });

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[cambiarPassword]', err);
    res.status(500).json({ ok: false, mensaje: 'Error al cambiar contraseña' });
  }
}

// ─────────────────────────────────────────────
// DELETE /usuarios/:id
// Elimina (o desactiva) un usuario
// ─────────────────────────────────────────────
async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const existe = await usuarioModel.findById(id);
    if (!existe) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    // Soft delete: marca estado = 'inactivo'
    await usuarioModel.update(id, { estado: 'inactivo' });

    // Hard delete: await usuarioModel.delete(id);

    res.json({ ok: true, mensaje: 'Usuario desactivado correctamente' });
  } catch (err) {
    console.error('[eliminar usuario]', err);
    res.status(500).json({ ok: false, mensaje: 'Error al eliminar usuario' });
  }
}

// ─────────────────────────────────────────────
// POST /auth/login
// Autenticación con control de bloqueo
// ─────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Email y password requeridos' });
    }

    // 1. Busca el usuario
    const usuario = await usuarioModel.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas' });
    }

    // 2. Verifica si está bloqueado
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      const hasta = new Date(usuario.bloqueado_hasta).toLocaleTimeString();
      return res.status(423).json({
        ok: false,
        mensaje: `Cuenta bloqueada hasta las ${hasta}. Intenta más tarde.`
      });
    }

    // 3. Verifica si está activo
    if (usuario.estado !== 'activo') {
      return res.status(403).json({ ok: false, mensaje: 'Cuenta inactiva. Contacta al administrador.' });
    }

    // 4. Verifica contraseña (pgcrypto)
    const credencialesOk = await usuarioModel.verificarPassword(email, password);

    if (!credencialesOk) {
      // Incrementa intentos
      const result = await usuarioModel.incrementarIntentos(usuario.id_usuario);
      const intentos = result.rows[0]?.intentos_fallidos ?? 0;

      if (intentos >= MAX_INTENTOS) {
        const hasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000);
        await usuarioModel.bloquear(usuario.id_usuario, hasta);
        return res.status(423).json({
          ok: false,
          mensaje: `Demasiados intentos fallidos. Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos.`
        });
      }

      return res.status(401).json({
        ok: false,
        mensaje: `Credenciales inválidas. Intentos restantes: ${MAX_INTENTOS - intentos}`
      });
    }

    // 5. Login exitoso
    await usuarioModel.loginExitoso(usuario.id_usuario);

    // 6. Genera token JWT (requiere jsonwebtoken instalado)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email:      usuario.email,
        rol:        usuario.rol,
        nivel:      usuario.nivel,
        id_cliente: usuario.id_cliente
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    delete usuario.password_hash;
    delete usuario.intentos_fallidos;
    delete usuario.bloqueado_hasta;

    res.json({ ok: true, token, data: usuario });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ ok: false, mensaje: 'Error en el proceso de autenticación' });
  }
}

// ─────────────────────────────────────────────
// PATCH /usuarios/:id/desbloquear
// Desbloquea manualmente un usuario (admin)
// ─────────────────────────────────────────────
async function desbloquear(req, res) {
  try {
    const { id } = req.params;

    const existe = await usuarioModel.findById(id);
    if (!existe) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    await usuarioModel.bloquear(id, null);           // limpia bloqueado_hasta
    await usuarioModel.update(id, { intentos_fallidos: 0 });

    res.json({ ok: true, mensaje: 'Usuario desbloqueado correctamente' });
  } catch (err) {
    console.error('[desbloquear]', err);
    res.status(500).json({ ok: false, mensaje: 'Error al desbloquear usuario' });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  cambiarPassword,
  eliminar,
  login,
  desbloquear
};