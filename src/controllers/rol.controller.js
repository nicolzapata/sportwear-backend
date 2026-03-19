const rolModel = require('../models/rol.model');

// GET /api/roles — Admin ve todos, otros ven solo activos sin detalles sensibles
const getRoles = async (req, res) => {
  try {
    const { rol } = req.usuario;

    if (rol === 'Admin') {
      // Admin ve todos los roles con sus permisos
      const roles = await rolModel.findAll();
      return res.json(roles);
    }

    // Otros roles solo ven los roles activos (sin permisos)
    const roles = await rolModel.findActivos();
    return res.json(roles);

  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// GET /api/roles/:id — Admin ve rol completo con permisos
const getRolById = async (req, res) => {
  try {
    const { rol } = req.usuario;
    const { id } = req.params;

    if (rol === 'Admin') {
      const rolConPermisos = await rolModel.findConPermisos(id);
      if (!rolConPermisos) return res.status(404).json({ message: 'Rol no encontrado.' });
      return res.json(rolConPermisos);
    }

    // Otros solo ven info básica
    const rolData = await rolModel.findById(id);
    if (!rolData) return res.status(404).json({ message: 'Rol no encontrado.' });
    return res.json(rolData);

  } catch (error) {
    console.error('Error al obtener rol:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = { getRoles, getRolById };