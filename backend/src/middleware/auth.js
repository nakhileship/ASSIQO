/**
 * src/middleware/auth.js
 * Reads Authorization header (Bearer <token>), verifies JWT,
 * loads user from database, attaches user to req.user.
 * Returns 401 if missing, invalid, or expired.
 */

const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, role, subject, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authMiddleware;
