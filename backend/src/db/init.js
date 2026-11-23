/**
 * src/db/init.js
 * Database initialization script.
 * Reads schema.sql then seed.sql and executes them against the DATABASE_URL connection pool.
 * Used for setting up local DB or hosted databases (Neon, Railway, Supabase).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function initDB() {
  console.log('[db:init] Connecting to database...');
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seed.sql');

    console.log('[db:init] Running schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('[db:init] Schema created successfully.');

    // Run any migrations in migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of migrationFiles) {
        console.log(`[db:init] Running migration: ${file}...`);
        const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(migrationSql);
      }
    }

    console.log('[db:init] Running seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('[db:init] Database seeded successfully.');

    console.log('[db:init] All migrations & seeds applied cleanly.');
  } catch (err) {
    console.error('[db:init] Initialization failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
