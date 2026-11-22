/**
 * src/routes/group.js
 * Endpoints for student groups: create, view mine, add/remove members.
 * All routes are student-only.
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');
const groupController = require('../controllers/groupController');

const router = express.Router();

// Apply auth and student role check to all group routes
router.use(authMiddleware);
router.use(requireRole('student'));

router.post('/', groupController.createGroup);
router.get('/mine', groupController.getMyGroup);
router.post('/:id/members', groupController.addMember);
router.delete('/:id/members/:userId', groupController.removeMember);

module.exports = router;
