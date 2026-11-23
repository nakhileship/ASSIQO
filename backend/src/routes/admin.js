/**
 * src/routes/admin.js
 * Admin routes protected by authMiddleware and requireRole('admin')
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');
const adminAssignmentController = require('../controllers/adminAssignmentController');
const adminTrackingController   = require('../controllers/adminTrackingController');
const adminAnalyticsController  = require('../controllers/adminAnalyticsController');

const router = express.Router();

// All routes here require authenticated admin
router.use(authMiddleware);
router.use(requireRole('admin'));

// Assignment management
router.post('/assignments', adminAssignmentController.createAssignment);
router.put('/assignments/:id', adminAssignmentController.updateAssignment);
router.get('/assignments', adminAssignmentController.getAssignments);

// Groups for assignment targeting
router.get('/groups', adminAssignmentController.getAdminGroups);

// Assignment submission tracking
router.get('/assignments/:id/submissions', adminTrackingController.getAssignmentSubmissions);

// Analytics
router.get('/analytics', adminAnalyticsController.getAnalytics);

module.exports = router;
