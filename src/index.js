const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();
const { verificarToken, soloAdmin } = require('./middlewares/auth.middleware'); // 👈 añadido

// ── Middlewares globales ──────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get("/", (req, res) => {
  res.send("API funcionando correctamente 🚀");
});

// ── Rutas públicas (sin token) ────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/catalogo',   require('./routes/catalogo'));
app.use('/api/productos',  require('./routes/productos'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/colores',    require('./routes/colores'));
app.use('/api/promociones',require('./routes/promociones'));

// ── Rutas protegidas (requieren sesión) ───────────────────────
app.use('/api/clientes',       verificarToken,            require('./routes/clientes'));
app.use('/api/ventas',         verificarToken,            require('./routes/ventas'));
app.use('/api/detalle-venta',  verificarToken,            require('./routes/detalleVenta'));
app.use('/api/pagos',          verificarToken,            require('./routes/pagos'));

// ── Rutas solo Admin ──────────────────────────────────────────
app.use('/api/roles',          verificarToken, soloAdmin, require('./routes/roles'));
app.use('/api/usuarios',       verificarToken, soloAdmin, require('./routes/usuarios'));
app.use('/api/barrios',        verificarToken, soloAdmin, require('./routes/barrios'));
app.use('/api/proveedores',    verificarToken, soloAdmin, require('./routes/proveedores'));
app.use('/api/compras',        verificarToken, soloAdmin, require('./routes/compras'));
app.use('/api/detalle-compra', verificarToken, soloAdmin, require('./routes/detalleCompra'));
app.use('/api/dashboard',      verificarToken, soloAdmin, require('./routes/dashboard'));
app.use('/api/imagenes',       verificarToken, soloAdmin, require('./routes/imagenes'));

// ── Manejador de errores global ───────────────────────────────
app.use(require('./middlewares/errorHandler'));

// ── Conexión y arranque ───────────────────────────────────────
const pool = require('./config/db');

pool.query('SELECT NOW()')
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch(err => console.error('❌ Error de conexión:', err));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});