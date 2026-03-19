const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 👈 CLAVE en Render

  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false
});

module.exports = pool;