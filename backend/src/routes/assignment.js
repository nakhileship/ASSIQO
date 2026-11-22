/**
 * src/routes/assignment.js
 * Endpoints for student assignments and submissions.
 * All routes here require student role.
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');
const studentAssignmentController = require('../controllers/studentAssignmentController');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('student'));

router.get('/', studentAssignmentController.getStudentAssignments);

module.exports = router;
