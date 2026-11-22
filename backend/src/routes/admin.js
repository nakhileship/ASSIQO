/**
 * src/routes/admin.js
 * Admin routes protected by authMiddleware and requireRole('admin')
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');
const adminAssignmentController = require('../controllers/adminAssignmentController');

const router = express.Router();

// All routes here require authenticated admin
router.use(authMiddleware);
router.use(requireRole('admin'));

// Temporary test route to verify role protection (removed in Task 7)
router.get('/ping', (req, res) => {
  return res.json({
    message: 'pong',
    admin: req.user.email,
    role: req.user.role,
  });
});

// Assignment management
router.post('/assignments', adminAssignmentController.createAssignment);
router.put('/assignments/:id', adminAssignmentController.updateAssignment);
router.get('/assignments', adminAssignmentController.getAssignments);

module.exports = router;
