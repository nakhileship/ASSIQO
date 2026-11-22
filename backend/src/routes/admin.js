/**
 * src/routes/admin.js
 * Admin routes protected by authMiddleware and requireRole('admin')
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// All routes here require authenticated admin
router.use(authMiddleware);
router.use(requireRole('admin'));

/**
 * GET /api/admin/ping
 * Role verification check endpoint
 */
router.get('/ping', (req, res) => {
  return res.json({
    message: 'pong',
    admin: req.user.email,
    role: req.user.role,
  });
});

module.exports = router;
