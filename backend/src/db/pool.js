/**
 * src/db/pool.js
 * Singleton pg Pool – shared across all controllers/routes.
 * Connection string is read from DATABASE_URL env var (see .env.example).
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis:    30_000,
  connectionTimeoutMillis: 5_000,
});

// Log unexpected idle-client errors so they don't swallow silently
pool.on('error', (err) => {
  console.error('[pg-pool] Unexpected idle client error:', err.message);
});

module.exports = pool;
