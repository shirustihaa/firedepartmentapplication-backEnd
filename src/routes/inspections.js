const express = require('express');
const router = express.Router();
const {
  scheduleInspection,
  getInspections,
  getInspection,
  updateInspection,
  rescheduleInspection
} = require('../controllers/inspectionController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/inspections:
 *   post:
 *     summary: Schedule a new inspection
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicationId
 *               - inspectionDate
 *             properties:
 *               applicationId:
 *                 type: string
 *               inspectionDate:
 *                 type: string
 *                 format: date-time
 *               inspectorId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inspection scheduled successfully
 */
router.post('/', protect, authorize('admin', 'inspector'), scheduleInspection);

/**
 * @swagger
 * /api/inspections:
 *   get:
 *     summary: Get all inspections
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of inspections
 */
router.get('/', protect, getInspections);

/**
 * @swagger
 * /api/inspections/{id}:
 *   get:
 *     summary: Get single inspection details
 *     tags: [Inspections]
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
 *         description: Inspection details
 */
router.get('/:id', protect, getInspection);

/**
 * @swagger
 * /api/inspections/{id}:
 *   put:
 *     summary: Update inspection with findings
 *     tags: [Inspections]
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
 *         description: Inspection updated successfully
 */
router.put('/:id', protect, authorize('admin', 'inspector'), updateInspection);

/**
 * @swagger
 * /api/inspections/{id}/reschedule:
 *   put:
 *     summary: Reschedule an inspection
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newDate:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inspection rescheduled successfully
 */
router.put('/:id/reschedule', protect, authorize('admin', 'inspector'), rescheduleInspection);

module.exports = router;