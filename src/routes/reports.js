const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getApplicationsReport,
  getInspectionsReport,
  getOverdueReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Get dashboard summary with all statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary data
 */
router.get('/summary', protect, authorize('admin', 'inspector'), getDashboardSummary);

/**
 * @swagger
 * /api/reports/applications:
 *   get:
 *     summary: Get detailed applications report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Applications report with statistics
 */
router.get('/applications', protect, authorize('admin', 'inspector'), getApplicationsReport);

/**
 * @swagger
 * /api/reports/inspections:
 *   get:
 *     summary: Get inspection performance report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inspections report with metrics
 */
router.get('/inspections', protect, authorize('admin', 'inspector'), getInspectionsReport);

/**
 * @swagger
 * /api/reports/overdue:
 *   get:
 *     summary: Get overdue applications and expiring licenses
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue items report
 */
router.get('/overdue', protect, authorize('admin', 'inspector'), getOverdueReport);

module.exports = router;