// src/routes/roles.js
const router = require('express').Router();
const make   = require('../controllers/crudFactory');
const pool   = require('../config/db');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

const ctrl = make('Roles', ['nombre','descripcion','estado'], 'id_rol');

router.get('/',             verificarToken, ctrl.getAll);
router.get('/:id',          verificarToken, ctrl.getOne);
router.post('/',            verificarToken, soloAdmin, ctrl.create);
router.put('/:id',          verificarToken, soloAdmin, ctrl.update);
/* ── Contar usuarios con este rol ── */
router.get('/:id/usuarios-count', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS total
       FROM "Usuarios"
       WHERE id_rol = $1 AND estado = 'Activo'`,
      [req.params.id]
    );
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Cambiar estado del rol + bloquear/desbloquear usuarios ── */
router.patch('/:id/estado', verificarToken, soloAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener estado actual del rol
    const rolResult = await client.query(
      `SELECT estado FROM "Roles" WHERE id_rol = $1`,
      [req.params.id]
    );
    if (!rolResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    const estadoActual  = rolResult.rows[0].estado;
    const nuevoEstado   = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';

    // Cambiar estado del rol
    const rolActualizado = await client.query(
      `UPDATE "Roles"
       SET estado = $1
       WHERE id_rol = $2
       RETURNING *`,
      [nuevoEstado, req.params.id]
    );

    // Bloquear o desbloquear usuarios con este rol
    await client.query(
      `UPDATE "Usuarios"
       SET estado = $1
       WHERE id_rol = $2`,
      [nuevoEstado, req.params.id]
    );

    await client.query('COMMIT');
    res.json(rolActualizado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
});

/* ── Permisos de un rol ── */
router.get('/:id/permisos', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id_permiso, p.nombre, p.modulo, p.accion
       FROM "Permisos" p
       JOIN "RolesPermisos" rp ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = $1
         AND rp.estado = 'Activo'
         AND p.estado  = 'Activo'
       ORDER BY p.modulo, p.accion`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Asignar permisos a un rol (reemplaza todos) ── */
router.put('/:id/permisos', verificarToken, soloAdmin, async (req, res) => {
  const { permisos = [] } = req.body; // array de id_permiso
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Desactivar los actuales
    await client.query(
      `UPDATE "RolesPermisos" SET estado = 'Inactivo' WHERE id_rol = $1`,
      [req.params.id]
    );
    // Insertar los nuevos (upsert)
    for (const id_permiso of permisos) {
      await client.query(
        `INSERT INTO "RolesPermisos" (id_rol, id_permiso, estado)
         VALUES ($1, $2, 'Activo')
         ON CONFLICT (id_rol, id_permiso)
         DO UPDATE SET estado = 'Activo'`,
        [req.params.id, id_permiso]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Permisos actualizados' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
});

module.exports = router;