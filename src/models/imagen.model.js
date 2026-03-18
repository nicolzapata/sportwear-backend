// src/models/imagen.model.js
// Tabla: Imagenes
// PK: id_imagen
// Columnas: id_imagen, tipo_referencia, id_referencia, url,
//           nombre_archivo, tipo_mime, tamanio_bytes, titulo,
//           descripcion, orden, es_principal, estado, fecha_subida
// CHECK: tipo_referencia IN ('Producto','Usuario','Promocion')
// FK: id_referencia → Productos(id_producto) ON DELETE CASCADE

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class ImagenModel extends BaseModel {
  constructor() {
    super('Imagenes', 'id_imagen');
  }

  async findByReferencia(tipo_referencia, id_referencia) {
    const result = await pool.query(
      `SELECT * FROM "Imagenes"
       WHERE tipo_referencia = $1 AND id_referencia = $2
       ORDER BY orden ASC, id_imagen ASC`,
      [tipo_referencia, id_referencia]
    );
    return result.rows;
  }

  async findPrincipal(tipo_referencia, id_referencia) {
    const result = await pool.query(
      `SELECT * FROM "Imagenes"
       WHERE tipo_referencia = $1 AND id_referencia = $2
         AND es_principal = true AND estado = 'Activo'
       LIMIT 1`,
      [tipo_referencia, id_referencia]
    );
    return result.rows[0] || null;
  }

  async setPrincipal(id_imagen, tipo_referencia, id_referencia) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE "Imagenes" SET es_principal = FALSE
         WHERE tipo_referencia = $1 AND id_referencia = $2`,
        [tipo_referencia, id_referencia]
      );
      const result = await client.query(
        `UPDATE "Imagenes" SET es_principal = TRUE
         WHERE id_imagen = $1 RETURNING *`,
        [id_imagen]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async siguientePrincipal(tipo_referencia, id_referencia) {
    await pool.query(
      `UPDATE "Imagenes" SET es_principal = TRUE
       WHERE id_imagen = (
         SELECT id_imagen FROM "Imagenes"
         WHERE tipo_referencia = $1 AND id_referencia = $2
         ORDER BY orden ASC LIMIT 1
       )`,
      [tipo_referencia, id_referencia]
    );
  }
}

module.exports = new ImagenModel();
