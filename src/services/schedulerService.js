const cron = require('node-cron');
//onst License = require('../models/License');
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


// Update expired licenses every day at midnight


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
exports.initializeScheduler = () => {
  logger.info('Initializing scheduler services...');
  
  scheduleOverdueCheck();
  scheduleExpiredNOCsUpdate();
  
  logger.info('All scheduler services initialized');
};


