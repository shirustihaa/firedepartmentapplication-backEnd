const express = require('express');
const router = express.Router();
const {
  issueLicense,
  getAllLicenses,
  getLicense,
  renewLicense,
  suspendLicense,
  revokeLicense
} = require('../controllers/licenseController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/licenses/{id}/issue:
 *   post:
 *     summary: Issue license for an application
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Application ID
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: License issued successfully
 */
router.post('/:id/issue', protect, authorize('admin'), issueLicense);

/**
 * @swagger
 * /api/licenses:
 *   get:
 *     summary: Get all licenses
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of licenses
 */
router.get('/', protect, getAllLicenses);

/**
 * @swagger
 * /api/licenses/{id}:
 *   get:
 *     summary: Get single license
 *     tags: [Licenses]
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
 *         description: License details
 */
router.get('/:id', protect, getLicense);

/**
 * @swagger
 * /api/licenses/{id}/renew:
 *   post:
 *     summary: Renew a license
 *     tags: [Licenses]
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
 *         description: License renewed successfully
 */
router.post('/:id/renew', protect, renewLicense);

/**
 * @swagger
 * /api/licenses/{id}/suspend:
 *   put:
 *     summary: Suspend a license
 *     tags: [Licenses]
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
 *         description: License suspended successfully
 */
router.put('/:id/suspend', protect, authorize('admin'), suspendLicense);

/**
 * @swagger
 * /api/licenses/{id}/revoke:
 *   put:
 *     summary: Revoke a license
 *     tags: [Licenses]
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
 *         description: License revoked successfully
 */
router.put('/:id/revoke', protect, authorize('admin'), revokeLicense);

module.exports = router;