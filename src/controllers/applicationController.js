const Application = require('../models/Application');
const notificationService = require('../services/notificationService');
const workflowService = require('../services/workflowService');
const logger = require('../utils/logger');

// @desc    Submit new application
// @route   POST /api/applications
// @access  Private (Citizen)
exports.createApplication = async (req, res) => {
  try {
    const applicationData = {
      ...req.body,
      applicant: req.user.id
    };

    const application = await Application.create(applicationData);

    // Set automatic deadlines
    await workflowService.setDeadlines(application);

    // Send notification to applicant
    await notificationService.sendApplicationSubmitted(req.user, application);

    // Notify admin about new application
    await notificationService.notifyAdminNewApplication(application);

    logger.info(`New application created: ${application.applicationNumber}`);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    logger.error(`Create application error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error creating application',
      error: error.message
    });
  }
};

// @desc    Get all applications (with filters)
// @route   GET /api/applications
// @access  Private
exports.getApplications = async (req, res) => {
  try {
    const { status, applicationType, priority, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    // If citizen, only show their applications
    if (req.user.role === 'citizen') {
      query.applicant = req.user.id;
    }

    // Apply filters
    if (status) query.status = status;
    if (applicationType) query.applicationType = applicationType;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const applications = await Application.find(query)
      .populate('applicant', 'name email phone')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      pages: Math.ceil(total / limit),
      data: applications
    });
  } catch (error) {
    logger.error(`Get applications error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
exports.getApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', 'name email phone address')
      .populate('assignedTo', 'name email')
      .populate('inspection')
      .populate('noc')
      .populate('license');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization - citizens can only view their own applications
    if (req.user.role === 'citizen' && application.applicant._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    logger.error(`Get application error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Admin/Inspector)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update status
    application.status = status;
    if (remarks) application.remarks = remarks;

    // Add to timeline
    application.timeline.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks
    });

    await application.save();

    // Process workflow based on new status
    await workflowService.processStatusChange(application, status);

    // Send notification
    await notificationService.sendStatusUpdate(application, status);

    logger.info(`Application ${application.applicationNumber} status updated to ${status}`);

    res.status(200).json({
      success: true,
      message: 'Application status updated',
      data: application
    });
  } catch (error) {
    logger.error(`Update application status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
};

// @desc    Assign application to inspector
// @route   PUT /api/applications/:id/assign
// @access  Private (Admin)
exports.assignApplication = async (req, res) => {
  try {
    const { inspectorId } = req.body;

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo: inspectorId,
        status: 'under_review'
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Add to timeline
    application.timeline.push({
      status: 'under_review',
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks: `Assigned to ${application.assignedTo.name}`
    });

    await application.save();

    // Notify inspector
    await notificationService.notifyInspectorAssignment(application);

    logger.info(`Application ${application.applicationNumber} assigned to inspector`);

    res.status(200).json({
      success: true,
      message: 'Application assigned successfully',
      data: application
    });
  } catch (error) {
    logger.error(`Assign application error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error assigning application',
      error: error.message
    });
  }
};

// @desc    Update follow-up status
// @route   PUT /api/applications/:id/followup
// @access  Private (Admin/Inspector)
exports.updateFollowUp = async (req, res) => {
  try {
    const { followUpStatus, remarks, requiresAdditionalFollowUp } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update status based on follow-up result
    if (followUpStatus === 'completed' && !requiresAdditionalFollowUp) {
      application.status = 'follow_up_completed';
    } else if (requiresAdditionalFollowUp) {
      application.status = 'follow_up_required';
      // Set new deadline
      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + parseInt(process.env.FOLLOWUP_DEADLINE_DAYS || 5));
      application.deadlines.followUp = newDeadline;
    }

    // Add to timeline
    application.timeline.push({
      status: application.status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks
    });

    await application.save();

    // Send notification
    await notificationService.sendFollowUpUpdate(application);

    logger.info(`Follow-up updated for application ${application.applicationNumber}`);

    res.status(200).json({
      success: true,
      message: 'Follow-up updated successfully',
      data: application
    });
  } catch (error) {
    logger.error(`Update follow-up error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error updating follow-up',
      error: error.message
    });
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private (Admin)
exports.deleteApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.deleteOne();

    logger.info(`Application ${application.applicationNumber} deleted`);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete application error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error deleting application',
      error: error.message
    });
  }
};