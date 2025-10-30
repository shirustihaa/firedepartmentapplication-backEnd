const express = require('express');
const router = express.Router();
const {
  createApplication,
  getApplications,
  getApplication,
  updateApplicationStatus,
  assignApplication,
  updateFollowUp,
  deleteApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/applications:
 *   post:
 *     summary: Submit new application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Application created successfully
 */
router.post('/', protect, authorize('citizen'), createApplication);

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get all applications (filtered by role)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: applicationType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of applications
 */
router.get('/', protect, getApplications);

/**
 * @swagger
 * /api/applications/{id}:
 *   get:
 *     summary: Get single application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application details
 */
router.get('/:id', protect, getApplication);

/**
 * @swagger
 * /api/applications/{id}/status:
 *   put:
 *     summary: Update application status
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put('/:id/status', protect, authorize('admin', 'inspector'), updateApplicationStatus);

/**
 * @swagger
 * /api/applications/{id}/assign:
 *   put:
 *     summary: Assign application to inspector
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application assigned successfully
 */
router.put('/:id/assign', protect, authorize('admin'), assignApplication);

/**
 * @swagger
 * /api/applications/{id}/followup:
 *   put:
 *     summary: Update follow-up status
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Follow-up updated
 */
router.put('/:id/followup', protect, authorize('admin', 'inspector'), updateFollowUp);

/**
 * @swagger
 * /api/applications/{id}:
 *   delete:
 *     summary: Delete application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application deleted
 */
router.delete('/:id', protect, authorize('admin'), deleteApplication);

module.exports = router;