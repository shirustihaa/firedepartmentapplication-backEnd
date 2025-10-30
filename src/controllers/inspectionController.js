const Inspection = require('../models/Inspection');
const Application = require('../models/Application');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// @desc    Schedule inspection
// @route   POST /api/inspections
// @access  Private (Admin/Inspector)
exports.scheduleInspection = async (req, res) => {
  try {
    const { applicationId, inspectionDate, inspectorId } = req.body;

    const application = await Application.findById(applicationId).populate('applicant');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Create inspection
    const inspection = await Inspection.create({
      application: applicationId,
      inspectionDate: new Date(inspectionDate),
      inspector: inspectorId || req.user.id,
      status: 'scheduled'
    });

    // Update application
    application.inspection = inspection._id;
    application.status = 'inspection_scheduled';
    application.timeline.push({
      status: 'inspection_scheduled',
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks: `Inspection scheduled for ${new Date(inspectionDate).toLocaleDateString()}`
    });
    await application.save();

    // Send notification
    await notificationService.sendInspectionScheduled(application.applicant, inspection, application);

    logger.info(`Inspection scheduled for application ${application.applicationNumber}`);

    res.status(201).json({
      success: true,
      message: 'Inspection scheduled successfully',
      data: inspection
    });
  } catch (error) {
    logger.error(`Schedule inspection error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error scheduling inspection',
      error: error.message
    });
  }
};

// @desc    Get all inspections
// @route   GET /api/inspections
// @access  Private
exports.getInspections = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};

    // If inspector, only show their inspections
    if (req.user.role === 'inspector') {
      query.inspector = req.user.id;
    }

    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const inspections = await Inspection.find(query)
      .populate('application')
      .populate('inspector', 'name email')
      .sort({ inspectionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inspection.countDocuments(query);

    res.status(200).json({
      success: true,
      count: inspections.length,
      total,
      pages: Math.ceil(total / limit),
      data: inspections
    });
  } catch (error) {
    logger.error(`Get inspections error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching inspections',
      error: error.message
    });
  }
};

// @desc    Get single inspection
// @route   GET /api/inspections/:id
// @access  Private
exports.getInspection = async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('application')
      .populate('inspector', 'name email phone');

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    logger.error(`Get inspection error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching inspection',
      error: error.message
    });
  }
};

// @desc    Update inspection (add findings)
// @route   PUT /api/inspections/:id
// @access  Private (Inspector/Admin)
exports.updateInspection = async (req, res) => {
  try {
    const { 
      checklistItems, 
      findings, 
      requiresFollowUp, 
      inspectorRemarks,
      status 
    } = req.body;

    const inspection = await Inspection.findById(req.params.id).populate('application');

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // Update inspection details
    if (checklistItems) inspection.checklistItems = checklistItems;
    if (findings) inspection.findings = findings;
    if (inspectorRemarks) inspection.inspectorRemarks = inspectorRemarks;
    if (requiresFollowUp !== undefined) inspection.requiresFollowUp = requiresFollowUp;
    if (status) inspection.status = status;

    // Calculate compliance percentage
    if (checklistItems && checklistItems.length > 0) {
      const compliantItems = checklistItems.filter(item => item.status === 'compliant').length;
      inspection.overallCompliance = Math.round((compliantItems / checklistItems.length) * 100);
    }

    // Mark as completed if status is completed
    if (status === 'completed') {
      inspection.completedAt = new Date();

      // Update application status
      const application = await Application.findById(inspection.application._id);
      
      if (requiresFollowUp) {
        application.status = 'follow_up_required';
      } else {
        application.status = 'inspection_completed';
      }

      application.timeline.push({
        status: application.status,
        timestamp: new Date(),
        updatedBy: req.user.id,
        remarks: `Inspection completed. Overall compliance: ${inspection.overallCompliance}%`
      });

      await application.save();
    }

    await inspection.save();

    logger.info(`Inspection ${inspection._id} updated`);

    res.status(200).json({
      success: true,
      message: 'Inspection updated successfully',
      data: inspection
    });
  } catch (error) {
    logger.error(`Update inspection error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error updating inspection',
      error: error.message
    });
  }
};

// @desc    Reschedule inspection
// @route   PUT /api/inspections/:id/reschedule
// @access  Private (Admin/Inspector)
exports.rescheduleInspection = async (req, res) => {
  try {
    const { newDate, reason } = req.body;

    const inspection = await Inspection.findById(req.params.id)
      .populate('application')
      .populate({
        path: 'application',
        populate: { path: 'applicant' }
      });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    inspection.inspectionDate = new Date(newDate);
    inspection.status = 'rescheduled';
    inspection.inspectorRemarks = `Rescheduled: ${reason}`;
    await inspection.save();

    // Update application timeline
    const application = await Application.findById(inspection.application._id);
    application.timeline.push({
      status: 'inspection_scheduled',
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks: `Inspection rescheduled to ${new Date(newDate).toLocaleDateString()}`
    });
    await application.save();

    // Send notification
    await notificationService.sendInspectionScheduled(
      inspection.application.applicant, 
      inspection, 
      application
    );

    logger.info(`Inspection ${inspection._id} rescheduled`);

    res.status(200).json({
      success: true,
      message: 'Inspection rescheduled successfully',
      data: inspection
    });
  } catch (error) {
    logger.error(`Reschedule inspection error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error rescheduling inspection',
      error: error.message
    });
  }
};