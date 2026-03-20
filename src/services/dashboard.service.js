// src/services/dashboard.service.js
const pool = require('../config/db');

const getResumen = async () => {
  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM "Ventas" WHERE fecha::date = CURRENT_DATE)                       AS ventas_hoy,
      (SELECT COALESCE(SUM(total),0) FROM "Ventas" WHERE estado='Pagado' AND fecha::date=CURRENT_DATE) AS ingresos_hoy,
      (SELECT COUNT(*) FROM "Clientes" WHERE estado='Activo')                                AS clientes_activos,
      (SELECT COUNT(*) FROM "Productos" WHERE stock < 5 AND estado='Activo')                 AS bajo_stock,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado='Pendiente')                               AS pedidos_pendientes,
      (SELECT COALESCE(SUM(total),0) FROM "Ventas" WHERE estado='Pagado')                    AS ingresos_totales
  `);

  const topResult = await pool.query(`
    SELECT p.nombre, SUM(dv.cantidad) AS total_vendido
    FROM "DetalleVenta" dv
    INNER JOIN "Productos" p ON dv.id_producto = p.id_producto
    INNER JOIN "Ventas"    v ON dv.id_venta    = v.id_venta
    WHERE v.estado != 'Anulado'
    GROUP BY p.nombre ORDER BY total_vendido DESC LIMIT 5
  `);

  const ventasResult = await pool.query(`
    SELECT v.id_venta, c.nombre AS cliente, p.nombre AS producto,
           v.total, v.estado, v.fecha
    FROM "Ventas" v
    INNER JOIN "Clientes"     c  ON v.id_cliente  = c.id_cliente
    LEFT  JOIN "DetalleVenta" dv ON dv.id_venta   = v.id_venta
    LEFT  JOIN "Productos"    p  ON dv.id_producto = p.id_producto
    ORDER BY v.fecha DESC LIMIT 5
  `);

  return {
    stats:           statsResult.rows[0],
    topProductos:    topResult.rows,
    ventasRecientes: ventasResult.rows,
  };
};

module.exports = { getResumen };