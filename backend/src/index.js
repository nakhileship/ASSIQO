/**
 * src/index.js
 * Application entry-point: load env → configure Express → mount routes → listen.
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const healthRouter     = require('./routes/health');
const authRouter       = require('./routes/auth');
const adminRouter      = require('./routes/admin');
const groupRouter      = require('./routes/group');
const assignmentRouter = require('./routes/assignment');
const errorHandler     = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health',      healthRouter);
app.use('/api/auth',        authRouter);
app.use('/api/groups',      groupRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/admin',       adminRouter);

// Routes for future phases will be mounted here (auth, groups, assignments…)

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[assiqo-backend] Listening on port ${PORT} (${process.env.NODE_ENV})`);
});

module.exports = app;
