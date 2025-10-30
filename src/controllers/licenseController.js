const License = require('../models/License');
const Application = require('../models/Application');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// @desc    Issue License
// @route   POST /api/licenses/:id/issue
// @access  Private (Admin)
exports.issueLicense = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { licenseType, validityYears, conditions, restrictions, fees, remarks } = req.body;

    const application = await Application.findById(applicationId).populate('applicant');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if NOC is issued before license
    if (!application.noc) {
      return res.status(400).json({
        success: false,
        message: 'NOC must be issued before license'
      });
    }

    // Calculate validity period
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + (validityYears || 1));

    // Create License
    const license = await License.create({
      application: applicationId,
      licensee: application.applicant._id,
      licenseType: licenseType || 'fire_safety',
      propertyDetails: application.propertyDetails,
      issuedBy: req.user.id,
      validFrom,
      validUntil,
      conditions: conditions || [],
      restrictions: restrictions || [],
      fees: fees || { amount: 0, paymentStatus: 'paid' },
      remarks
    });

    // Update application
    application.license = license._id;
    application.status = 'license_issued';
    application.timeline.push({
      status: 'license_issued',
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks: `License issued: ${license.licenseNumber}`
    });
    await application.save();

    // Send notification
    await notificationService.sendLicenseIssued(application.applicant, license);

    logger.info(`License issued: ${license.licenseNumber} for application ${application.applicationNumber}`);

    res.status(201).json({
      success: true,
      message: 'License issued successfully',
      data: license
    });
  } catch (error) {
    logger.error(`Issue license error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error issuing license',
      error: error.message
    });
  }
};

// @desc    Get all licenses
// @route   GET /api/licenses
// @access  Private
exports.getAllLicenses = async (req, res) => {
  try {
    const { status, licenseType, page = 1, limit = 10 } = req.query;

    let query = {};

    // If citizen, only show their licenses
    if (req.user.role === 'citizen') {
      query.licensee = req.user.id;
    }

    if (status) query.status = status;
    if (licenseType) query.licenseType = licenseType;

    const skip = (page - 1) * limit;

    const licenses = await License.find(query)
      .populate('licensee', 'name email phone')
      .populate('application')
      .populate('issuedBy', 'name')
      .sort({ issuedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await License.countDocuments(query);

    res.status(200).json({
      success: true,
      count: licenses.length,
      total,
      pages: Math.ceil(total / limit),
      data: licenses
    });
  } catch (error) {
    logger.error(`Get licenses error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching licenses',
      error: error.message
    });
  }
};

// @desc    Get single license
// @route   GET /api/licenses/:id
// @access  Private
exports.getLicense = async (req, res) => {
  try {
    const license = await License.findById(req.params.id)
      .populate('licensee', 'name email phone address')
      .populate('application')
      .populate('issuedBy', 'name email');

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    // Check authorization
    if (req.user.role === 'citizen' && license.licensee._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this license'
      });
    }

    res.status(200).json({
      success: true,
      data: license
    });
  } catch (error) {
    logger.error(`Get license error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching license',
      error: error.message
    });
  }
};

// @desc    Renew license
// @route   POST /api/licenses/:id/renew
// @access  Private
exports.renewLicense = async (req, res) => {
  try {
    const { validityYears, fees } = req.body;

    const license = await License.findById(req.params.id).populate('licensee');

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    // Check authorization for citizen
    if (req.user.role === 'citizen' && license.licensee._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to renew this license'
      });
    }

    // Store old expiry date
    const previousExpiryDate = license.validUntil;

    // Calculate new expiry date
    const newExpiryDate = new Date(license.validUntil);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + (validityYears || 1));

    // Update license
    license.validUntil = newExpiryDate;
    license.status = 'active';
    license.reminderSent = false;

    // Add to renewal history
    license.renewalHistory.push({
      renewedDate: new Date(),
      previousExpiryDate,
      newExpiryDate,
      renewedBy: req.user.id
    });

    // Update fees if provided
    if (fees) {
      license.fees = {
        ...license.fees,
        ...fees
      };
    }

    await license.save();

    logger.info(`License renewed: ${license.licenseNumber}`);

    res.status(200).json({
      success: true,
      message: 'License renewed successfully',
      data: license
    });
  } catch (error) {
    logger.error(`Renew license error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error renewing license',
      error: error.message
    });
  }
};

// @desc    Suspend license
// @route   PUT /api/licenses/:id/suspend
// @access  Private (Admin)
exports.suspendLicense = async (req, res) => {
  try {
    const { reason } = req.body;

    const license = await License.findById(req.params.id).populate('licensee');

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    license.status = 'suspended';
    license.remarks = `Suspended: ${reason}`;
    await license.save();

    logger.info(`License suspended: ${license.licenseNumber}`);

    res.status(200).json({
      success: true,
      message: 'License suspended successfully',
      data: license
    });
  } catch (error) {
    logger.error(`Suspend license error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error suspending license',
      error: error.message
    });
  }
};

// @desc    Revoke license
// @route   PUT /api/licenses/:id/revoke
// @access  Private (Admin)
exports.revokeLicense = async (req, res) => {
  try {
    const { reason } = req.body;

    const license = await License.findById(req.params.id).populate('licensee');

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    license.status = 'revoked';
    license.remarks = `Revoked: ${reason}`;
    await license.save();

    logger.info(`License revoked: ${license.licenseNumber}`);

    res.status(200).json({
      success: true,
      message: 'License revoked successfully',
      data: license
    });
  } catch (error) {
    logger.error(`Revoke license error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error revoking license',
      error: error.message
    });
  }
};