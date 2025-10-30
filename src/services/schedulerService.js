const cron = require('node-cron');
const License = require('../models/License');
const workflowService = require('./workflowService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

// Check for overdue applications every hour
const scheduleOverdueCheck = () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('Running overdue applications check...');
    const count = await workflowService.checkOverdueApplications();
    logger.info(`Found ${count} overdue applications`);
  });
};

// Check for license renewals every day at 9 AM
const scheduleLicenseRenewalCheck = () => {
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running license renewal check...');
    
    try {
      const User = require('../models/User');
      
      const licenses = await License.find({
        status: 'active',
        reminderSent: false
      }).populate('licensee');

      let reminderCount = 0;

      for (const license of licenses) {
        if (license.needsRenewalReminder()) {
          await notificationService.sendLicenseRenewalReminder(license.licensee, license);
          license.reminderSent = true;
          await license.save();
          reminderCount++;
        }
      }

      logger.info(`Sent ${reminderCount} license renewal reminders`);
    } catch (error) {
      logger.error(`License renewal check error: ${error.message}`);
    }
  });
};

// Update expired licenses every day at midnight
const scheduleExpiredLicensesUpdate = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Updating expired licenses...');
    
    try {
      const now = new Date();
      
      const result = await License.updateMany(
        {
          status: 'active',
          validUntil: { $lt: now }
        },
        {
          $set: { status: 'expired' }
        }
      );

      logger.info(`Updated ${result.modifiedCount} expired licenses`);
    } catch (error) {
      logger.error(`Expired licenses update error: ${error.message}`);
    }
  });
};

// Update expired NOCs every day at midnight
const scheduleExpiredNOCsUpdate = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Updating expired NOCs...');
    
    try {
      const NOC = require('../models/NOC');
      const now = new Date();
      
      const result = await NOC.updateMany(
        {
          status: 'active',
          validUntil: { $lt: now }
        },
        {
          $set: { status: 'expired' }
        }
      );

      logger.info(`Updated ${result.modifiedCount} expired NOCs`);
    } catch (error) {
      logger.error(`Expired NOCs update error: ${error.message}`);
    }
  });
};

// Initialize all scheduled tasks
exports.initializeScheduler = () => {
  logger.info('Initializing scheduler services...');
  
  scheduleOverdueCheck();
  scheduleLicenseRenewalCheck();
  scheduleExpiredLicensesUpdate();
  scheduleExpiredNOCsUpdate();
  
  logger.info('All scheduler services initialized');
};


