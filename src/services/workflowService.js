const Application = require('../models/Application');
const logger = require('../utils/logger');

// Set automatic deadlines for application
exports.setDeadlines = async (application) => {
  const inspectionDeadlineDays = parseInt(process.env.INSPECTION_DEADLINE_DAYS || 7);
  
  const inspectionDeadline = new Date();
  inspectionDeadline.setDate(inspectionDeadline.getDate() + inspectionDeadlineDays);
  
  application.deadlines = {
    inspection: inspectionDeadline,
    followUp: null,
    finalDecision: null
  };
  
  await application.save();
  logger.info(`Deadlines set for application ${application.applicationNumber}`);
};

// Process status change and trigger workflows
exports.processStatusChange = async (application, newStatus) => {
  try {
    switch (newStatus) {
      case 'inspection_scheduled':
        const inspectionDate = new Date();
        inspectionDate.setDate(inspectionDate.getDate() + 7);
        application.deadlines.inspection = inspectionDate;
        break;

      case 'follow_up_required':
        const followUpDeadline = new Date();
        followUpDeadline.setDate(followUpDeadline.getDate() + parseInt(process.env.FOLLOWUP_DEADLINE_DAYS || 5));
        application.deadlines.followUp = followUpDeadline;
        break;

      case 'follow_up_completed':
        application.status = 'approved';
        break;

      case 'approved':
        const finalDeadline = new Date();
        finalDeadline.setDate(finalDeadline.getDate() + 3);
        application.deadlines.finalDecision = finalDeadline;
        break;

      case 'rejected':
        application.deadlines = {};
        break;
    }

    await application.save();
    logger.info(`Workflow processed for application ${application.applicationNumber}: ${newStatus}`);
  } catch (error) {
    logger.error(`Workflow processing error: ${error.message}`);
  }
};

// Check for overdue applications
exports.checkOverdueApplications = async () => {
  try {
    const now = new Date();

    const overdueInspections = await Application.find({
      'deadlines.inspection': { $lt: now },
      status: { $in: ['submitted', 'under_review', 'inspection_scheduled'] },
      isOverdue: false
    });

    const overdueFollowUps = await Application.find({
      'deadlines.followUp': { $lt: now },
      status: 'follow_up_required',
      isOverdue: false
    });

    const overdueApplications = [...overdueInspections, ...overdueFollowUps];

    for (const application of overdueApplications) {
      application.isOverdue = true;
      await application.save();
      
      const notificationService = require('./notificationService');
      const User = require('../models/User');
      const user = await User.findById(application.applicant);
      
      if (user) {
        await notificationService.sendOverdueNotification(user, application);
      }
      
      logger.info(`Application ${application.applicationNumber} marked as overdue`);
    }

    return overdueApplications.length;
  } catch (error) {
    logger.error(`Check overdue applications error: ${error.message}`);
    return 0;
  }
};

// Auto-assign applications based on workload
exports.autoAssignApplication = async (application) => {
  try {
    const User = require('../models/User');
    
    const inspectors = await User.find({ role: 'inspector', isActive: true });

    if (inspectors.length === 0) {
      logger.warn('No active inspectors available for assignment');
      return;
    }

    const assignmentCounts = await Promise.all(
      inspectors.map(async (inspector) => ({
        inspector,
        count: await Application.countDocuments({
          assignedTo: inspector._id,
          status: { $nin: ['approved', 'rejected', 'noc_issued', 'license_issued'] }
        })
      }))
    );

    assignmentCounts.sort((a, b) => a.count - b.count);
    const selectedInspector = assignmentCounts[0].inspector;

    application.assignedTo = selectedInspector._id;
    application.status = 'under_review';
    await application.save();

    logger.info(`Application ${application.applicationNumber} auto-assigned to ${selectedInspector.name}`);

    const notificationService = require('./notificationService');
    await notificationService.notifyInspectorAssignment(application);

  } catch (error) {
    logger.error(`Auto-assign application error: ${error.message}`);
  }
};