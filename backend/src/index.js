/**
 * src/index.js
 * Application entry-point: load env → configure Express → mount routes → listen.
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const healthRouter = require('./routes/health');
const authRouter   = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth',   authRouter);

// Routes for future phases will be mounted here (auth, groups, assignments…)

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Generic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[assiqo-backend] Listening on port ${PORT} (${process.env.NODE_ENV})`);
});

module.exports = app;
