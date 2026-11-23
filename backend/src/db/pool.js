/**
 * src/db/pool.js
 * Singleton pg Pool – shared across all controllers/routes.
 * DATABASE_URL is required. SSL is enabled automatically in production
 * (NODE_ENV=production) to support hosted providers (Neon, Railway, etc.).
 */

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis:  5_000,
});

// Log unexpected idle-client errors so they don't swallow silently
pool.on('error', (err) => {
  console.error('[pg-pool] Unexpected idle client error:', err.message);
});

module.exports = pool;
