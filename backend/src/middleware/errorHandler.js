/**
 * src/middleware/errorHandler.js
 * Centralized error handler returning consistent JSON errors: { error: "message" }
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return res.status(status).json({ error: message });
};

module.exports = errorHandler;
