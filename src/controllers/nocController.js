const NOC = require('../models/NOC');
const Application = require('../models/Application');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// @desc    Issue NOC
// @route   POST /api/noc/:id/issue
// @access  Private (Admin)
exports.issueNOC = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { nocType, validityMonths, conditions, restrictions, remarks } = req.body;

    const application = await Application.findById(applicationId).populate('applicant');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if application is eligible for NOC
    if (application.status !== 'follow_up_completed' && application.status !== 'inspection_completed') {
      return res.status(400).json({
        success: false,
        message: 'Application is not eligible for NOC issuance'
      });
    }

    // Calculate validity period
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + (validityMonths || 12));

    // Create NOC
    const noc = await NOC.create({
      application: applicationId,
      applicant: application.applicant._id,
      propertyDetails: application.propertyDetails,
      nocType: nocType || 'construction',
      issuedBy: req.user.id,
      validUntil,
      conditions: conditions || [],
      restrictions: restrictions || [],
      remarks
    });

    // Update application
    application.noc = noc._id;
    application.status = 'noc_issued';
    application.timeline.push({
      status: 'noc_issued',
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks: `NOC issued: ${noc.nocNumber}`
    });
    await application.save();

    // Send notification
    await notificationService.sendNOCIssued(application.applicant, noc);

    logger.info(`NOC issued: ${noc.nocNumber} for application ${application.applicationNumber}`);

    res.status(201).json({
      success: true,
      message: 'NOC issued successfully',
      data: noc
    });
  } catch (error) {
    logger.error(`Issue NOC error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error issuing NOC',
      error: error.message
    });
  }
};

// @desc    Get all NOCs
// @route   GET /api/noc
// @access  Private
exports.getAllNOCs = async (req, res) => {
  try {
    const { status, nocType, page = 1, limit = 10 } = req.query;

    let query = {};

    // If citizen, only show their NOCs
    if (req.user.role === 'citizen') {
      query.applicant = req.user.id;
    }

    if (status) query.status = status;
    if (nocType) query.nocType = nocType;

    const skip = (page - 1) * limit;

    const nocs = await NOC.find(query)
      .populate('applicant', 'name email phone')
      .populate('application')
      .populate('issuedBy', 'name')
      .sort({ issuedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await NOC.countDocuments(query);

    res.status(200).json({
      success: true,
      count: nocs.length,
      total,
      pages: Math.ceil(total / limit),
      data: nocs
    });
  } catch (error) {
    logger.error(`Get NOCs error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching NOCs',
      error: error.message
    });
  }
};

// @desc    Get single NOC
// @route   GET /api/noc/:id
// @access  Private
exports.getNOC = async (req, res) => {
  try {
    const noc = await NOC.findById(req.params.id)
      .populate('applicant', 'name email phone address')
      .populate('application')
      .populate('issuedBy', 'name email');

    if (!noc) {
      return res.status(404).json({
        success: false,
        message: 'NOC not found'
      });
    }

    // Check authorization
    if (req.user.role === 'citizen' && noc.applicant._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this NOC'
      });
    }

    res.status(200).json({
      success: true,
      data: noc
    });
  } catch (error) {
    logger.error(`Get NOC error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching NOC',
      error: error.message
    });
  }
};

// @desc    Revoke NOC
// @route   PUT /api/noc/:id/revoke
// @access  Private (Admin)
exports.revokeNOC = async (req, res) => {
  try {
    const { reason } = req.body;

    const noc = await NOC.findById(req.params.id).populate('applicant');

    if (!noc) {
      return res.status(404).json({
        success: false,
        message: 'NOC not found'
      });
    }

    noc.status = 'revoked';
    noc.remarks = `Revoked: ${reason}`;
    await noc.save();

    // Notify applicant
    await notificationService.sendNOCRevoked(noc.applicant, noc, reason);

    logger.info(`NOC revoked: ${noc.nocNumber}`);

    res.status(200).json({
      success: true,
      message: 'NOC revoked successfully',
      data: noc
    });
  } catch (error) {
    logger.error(`Revoke NOC error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error revoking NOC',
      error: error.message
    });
  }
};