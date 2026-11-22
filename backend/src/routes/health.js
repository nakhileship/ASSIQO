/**
 * src/routes/health.js
 * GET /api/health  – liveness + DB connectivity probe.
 * Returns 200 with db_time when healthy, 503 when DB is unreachable.
 */

const express = require('express');
const pool    = require('../db/pool');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS db_time');
    return res.json({
      status:  'ok',
      service: 'assiqo-backend',
      db_time: rows[0].db_time,
    });
  } catch (err) {
    console.error('[health] DB check failed:', err.message);
    return res.status(503).json({
      status:  'error',
      message: 'Database unreachable',
    });
  }
});

module.exports = router;
