const logger = require('../utils/logger');

// WebSocket instance (will be set from app.js)
let io = null;

exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

// Send in-app notification via WebSocket
const sendInAppNotification = (userId, notification) => {
  if (io) {
    io.to(userId.toString()).emit('notification', notification);
    logger.info(`In-app notification sent to user ${userId}`);
  }
};

// Application submitted notification
exports.sendApplicationSubmitted = async (user, application) => {
  logger.info(`Application submitted by ${user.name}: ${application.applicationNumber}`);
  
  if (user.notificationPreferences && user.notificationPreferences.inApp) {
    sendInAppNotification(user._id, {
      type: 'application_submitted',
      title: 'Application Submitted',
      message: `Your application ${application.applicationNumber} has been submitted.`,
      applicationId: application._id
    });
  }
};

// Notify admin about new application
exports.notifyAdminNewApplication = async (application) => {
  if (io) {
    io.to('admin').emit('notification', {
      type: 'new_application',
      title: 'New Application',
      message: `New application received: ${application.applicationNumber}`,
      applicationId: application._id
    });
  }
};

// Status update notification
exports.sendStatusUpdate = async (application, newStatus) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(application.applicant);
    
    if (!user) return;

    logger.info(`Status updated for application ${application.applicationNumber}: ${newStatus}`);

    if (user.notificationPreferences && user.notificationPreferences.inApp) {
      sendInAppNotification(user._id, {
        type: 'status_update',
        title: 'Status Updated',
        message: `Application status changed to: ${newStatus}`,
        applicationId: application._id
      });
    }
  } catch (error) {
    logger.error(`Send status update error: ${error.message}`);
  }
};

// Inspection scheduled notification
exports.sendInspectionScheduled = async (user, inspection, application) => {
  logger.info(`Inspection scheduled for application ${application.applicationNumber}`);

  if (user.notificationPreferences && user.notificationPreferences.inApp) {
    sendInAppNotification(user._id, {
      type: 'inspection_scheduled',
      title: 'Inspection Scheduled',
      message: `Inspection scheduled for ${inspection.inspectionDate.toLocaleDateString()}`,
      applicationId: application._id
    });
  }
};

// Follow-up notification
exports.sendFollowUpUpdate = async (application) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(application.applicant);
    
    if (!user) return;

    logger.info(`Follow-up required for application ${application.applicationNumber}`);

    if (user.notificationPreferences && user.notificationPreferences.inApp) {
      sendInAppNotification(user._id, {
        type: 'follow_up',
        title: 'Follow-up Required',
        message: `Follow-up needed for application ${application.applicationNumber}`,
        applicationId: application._id
      });
    }
  } catch (error) {
    logger.error(`Send follow-up error: ${error.message}`);
  }
};

// NOC issued notification
exports.sendNOCIssued = async (user, noc) => {
  logger.info(`NOC issued: ${noc.nocNumber}`);

  if (user.notificationPreferences && user.notificationPreferences.inApp) {
    sendInAppNotification(user._id, {
      type: 'noc_issued',
      title: 'NOC Issued',
      message: `NOC ${noc.nocNumber} has been issued successfully.`,
      nocId: noc._id
    });
  }
};







// Overdue notification
exports.sendOverdueNotification = async (user, application) => {
  logger.info(`Application overdue: ${application.applicationNumber}`);

  if (user.notificationPreferences && user.notificationPreferences.inApp) {
    sendInAppNotification(user._id, {
      type: 'overdue',
      title: 'Application Overdue',
      message: `Application ${application.applicationNumber} is overdue.`,
      applicationId: application._id
    });
  }
};

// Notify inspector about assignment
exports.notifyInspectorAssignment = async (application) => {
  try {
    const User = require('../models/User');
    const inspector = await User.findById(application.assignedTo);
    
    if (!inspector) return;

    logger.info(`Inspector assigned to application ${application.applicationNumber}`);

    if (inspector.notificationPreferences && inspector.notificationPreferences.inApp) {
      sendInAppNotification(inspector._id, {
        type: 'assignment',
        title: 'New Assignment',
        message: `Application ${application.applicationNumber} assigned to you.`,
        applicationId: application._id
      });
    }
  } catch (error) {
    logger.error(`Notify inspector error: ${error.message}`);
  }
};

// NOC revoked notification
exports.sendNOCRevoked = async (user, noc, reason) => {
  logger.info(`NOC revoked: ${noc.nocNumber}`);

  if (user.notificationPreferences && user.notificationPreferences.inApp) {
    sendInAppNotification(user._id, {
      type: 'noc_revoked',
      title: 'NOC Revoked',
      message: `NOC ${noc.nocNumber} has been revoked. Reason: ${reason}`,
      nocId: noc._id
    });
  }
};