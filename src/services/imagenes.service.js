// src/services/imagenes.service.js
const imagenModel = require('../models/imagen.model');

const getImagenesByReferencia = async (tipo_referencia, id_referencia) => {
  if (!tipo_referencia || !id_referencia)
    throw { status: 400, message: 'tipo_referencia e id_referencia son requeridos' };
  return await imagenModel.findByReferencia(tipo_referencia, id_referencia);
};

const getImagenPrincipal = async (tipo_referencia, id_referencia) => {
  if (!tipo_referencia || !id_referencia)
    throw { status: 400, message: 'tipo_referencia e id_referencia son requeridos' };
  const imagen = await imagenModel.findPrincipal(tipo_referencia, id_referencia);
  if (!imagen) throw { status: 404, message: 'No hay imagen principal' };
  return imagen;
};

const getImagenById = async (id) => {
  const imagen = await imagenModel.findById(id);
  if (!imagen) throw { status: 404, message: 'Imagen no encontrada' };
  return imagen;
};

const crearImagen = async (datos) => {
  const { tipo_referencia, id_referencia, url, nombre_archivo, tipo_mime,
          tamanio_bytes, titulo, descripcion, orden, es_principal, estado } = datos;
  if (!tipo_referencia || !id_referencia || !url)
    throw { status: 400, message: 'tipo_referencia, id_referencia y url son requeridos' };

  return await imagenModel.create({
    tipo_referencia,
    id_referencia,
    url,
    nombre_archivo: nombre_archivo || null,
    tipo_mime:      tipo_mime      || null,
    tamanio_bytes:  tamanio_bytes  || null,
    titulo:         titulo         || null,
    descripcion:    descripcion    || null,
    orden:          orden          ?? 0,
    es_principal:   es_principal   || false,
    estado:         estado         || 'Activo',
  });
};

const setPrincipal = async (id, tipo_referencia, id_referencia) => {
  if (!tipo_referencia || !id_referencia)
    throw { status: 400, message: 'tipo_referencia e id_referencia son requeridos' };
  return await imagenModel.setPrincipal(id, tipo_referencia, id_referencia);
};

const toggleEstado = async (id) => {
  const imagen = await imagenModel.findById(id);
  if (!imagen) throw { status: 404, message: 'Imagen no encontrada' };

  const nuevoEstado = imagen.estado === 'Activo' ? 'Inactivo' : 'Activo';
  return await imagenModel.update(id, { estado: nuevoEstado });
};

const eliminarImagen = async (id) => {
  const imagen = await imagenModel.findById(id);
  if (!imagen) throw { status: 404, message: 'Imagen no encontrada' };

  await imagenModel.delete(id);

  // Si era la principal, promover la siguiente
  if (imagen.es_principal) {
    await imagenModel.siguientePrincipal(imagen.tipo_referencia, imagen.id_referencia);
  }
};

module.exports = { getImagenesByReferencia, getImagenPrincipal, getImagenById, crearImagen, setPrincipal, toggleEstado, eliminarImagen };