/**
 * src/index.js
 * Application entry-point: load env → configure Express → mount routes → listen.
 */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const healthRouter     = require('./routes/health');
const authRouter       = require('./routes/auth');
const adminRouter      = require('./routes/admin');
const groupRouter      = require('./routes/group');
const assignmentRouter = require('./routes/assignment');
const errorHandler     = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (Render, Vercel, Railway, Nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// ── Global middleware ─────────────────────────────────────────────────────────
const clientUrlEnv = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173';
const allowedOrigins = clientUrlEnv.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

// ── Rate Limiter for Auth ─────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health',      healthRouter);
app.use('/api/auth',        authLimiter, authRouter);
app.use('/api/groups',      groupRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/admin',       adminRouter);

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
