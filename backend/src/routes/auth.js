/**
 * src/routes/auth.js
 * Endpoints for user authentication: register, login, and me
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

// Temporary inline token check for GET /me prior to middleware migration in Task 3
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_replace_in_production';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = rows[0];
    return authController.getMe(req, res, next);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
