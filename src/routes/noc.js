const express = require('express');
const router = express.Router();
const {
  issueNOC,
  getAllNOCs,
  getNOC,
  revokeNOC
} = require('../controllers/nocController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/noc/{id}/issue:
 *   post:
 *     summary: Issue NOC for an application
 *     tags: [NOC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Application ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nocType:
 *                 type: string
 *                 enum: [construction, occupancy, event, renovation]
 *               validityMonths:
 *                 type: number
 *               conditions:
 *                 type: array
 *                 items:
 *                   type: string
 *               restrictions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: NOC issued successfully
 */
router.post('/:id/issue', protect, authorize('admin'), issueNOC);

/**
 * @swagger
 * /api/noc:
 *   get:
 *     summary: Get all NOCs
 *     tags: [NOC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: nocType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of NOCs
 */
router.get('/', protect, getAllNOCs);

/**
 * @swagger
 * /api/noc/{id}:
 *   get:
 *     summary: Get single NOC details
 *     tags: [NOC]
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
 *         description: NOC details
 */
router.get('/:id', protect, getNOC);

/**
 * @swagger
 * /api/noc/{id}/revoke:
 *   put:
 *     summary: Revoke an NOC
 *     tags: [NOC]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: NOC revoked successfully
 */
router.put('/:id/revoke', protect, authorize('admin'), revokeNOC);

module.exports = router;