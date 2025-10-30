const Application = require('../models/Application');
const Inspection = require('../models/Inspection');
const NOC = require('../models/NOC');
const License = require('../models/License');
const logger = require('../utils/logger');

// @desc    Get dashboard summary
// @route   GET /api/reports/summary
// @access  Private (Admin)
exports.getDashboardSummary = async (req, res) => {
  try {
    // Total applications
    const totalApplications = await Application.countDocuments();
    
    // Applications by status
    const applicationsByStatus = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Applications by type
    const applicationsByType = await Application.aggregate([
      {
        $group: {
          _id: '$applicationType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Pending applications
    const pendingApplications = await Application.countDocuments({
      status: { $in: ['submitted', 'under_review', 'inspection_scheduled'] }
    });

    // Overdue applications
    const overdueApplications = await Application.countDocuments({
      isOverdue: true,
      status: { $nin: ['approved', 'rejected', 'noc_issued', 'license_issued'] }
    });

    // Inspections stats
    const totalInspections = await Inspection.countDocuments();
    const completedInspections = await Inspection.countDocuments({ status: 'completed' });
    const scheduledInspections = await Inspection.countDocuments({ status: 'scheduled' });

    // Follow-ups required
    const followUpsRequired = await Application.countDocuments({
      status: 'follow_up_required'
    });

    // NOC stats
    const totalNOCs = await NOC.countDocuments();
    const activeNOCs = await NOC.countDocuments({ status: 'active' });
    const expiredNOCs = await NOC.countDocuments({ status: 'expired' });

    // License stats
    const totalLicenses = await License.countDocuments();
    const activeLicenses = await License.countDocuments({ status: 'active' });
    const expiringLicenses = await License.countDocuments({
      status: 'active',
      validUntil: {
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      }
    });

    // Recent applications (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentApplications = await Application.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Average processing time (completed applications)
    const processingTimeStats = await Application.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'noc_issued', 'license_issued'] }
        }
      },
      {
        $project: {
          processingTime: {
            $subtract: ['$updatedAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);

    const avgProcessingDays = processingTimeStats.length > 0 
      ? Math.round(processingTimeStats[0].avgProcessingTime / (1000 * 60 * 60 * 24))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        applications: {
          total: totalApplications,
          pending: pendingApplications,
          overdue: overdueApplications,
          recent: recentApplications,
          byStatus: applicationsByStatus,
          byType: applicationsByType,
          avgProcessingDays
        },
        inspections: {
          total: totalInspections,
          completed: completedInspections,
          scheduled: scheduledInspections
        },
        followUps: {
          required: followUpsRequired
        },
        nocs: {
          total: totalNOCs,
          active: activeNOCs,
          expired: expiredNOCs
        },
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          expiring: expiringLicenses
        }
      }
    });
  } catch (error) {
    logger.error(`Get dashboard summary error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
};

// @desc    Get applications report with filters
// @route   GET /api/reports/applications
// @access  Private (Admin)
exports.getApplicationsReport = async (req, res) => {
  try {
    const { startDate, endDate, status, applicationType } = req.query;

    let query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (status) query.status = status;
    if (applicationType) query.applicationType = applicationType;

    const applications = await Application.find(query)
      .populate('applicant', 'name email')
      .populate('assignedTo', 'name')
      .select('applicationNumber applicationType status createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Generate statistics
    const stats = {
      total: applications.length,
      byStatus: {},
      byType: {}
    };

    applications.forEach(app => {
      stats.byStatus[app.status] = (stats.byStatus[app.status] || 0) + 1;
      stats.byType[app.applicationType] = (stats.byType[app.applicationType] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        applications,
        statistics: stats
      }
    });
  } catch (error) {
    logger.error(`Get applications report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error generating applications report',
      error: error.message
    });
  }
};

// @desc    Get inspection performance report
// @route   GET /api/reports/inspections
// @access  Private (Admin)
exports.getInspectionsReport = async (req, res) => {
  try {
    const { startDate, endDate, inspector } = req.query;

    let query = {};

    if (startDate || endDate) {
      query.inspectionDate = {};
      if (startDate) query.inspectionDate.$gte = new Date(startDate);
      if (endDate) query.inspectionDate.$lte = new Date(endDate);
    }

    if (inspector) query.inspector = inspector;

    const inspections = await Inspection.find(query)
      .populate('inspector', 'name')
      .populate('application', 'applicationNumber')
      .sort({ inspectionDate: -1 });

    // Performance metrics
    const metrics = {
      total: inspections.length,
      completed: inspections.filter(i => i.status === 'completed').length,
      scheduled: inspections.filter(i => i.status === 'scheduled').length,
      avgCompliance: 0,
      requireFollowUp: inspections.filter(i => i.requiresFollowUp).length
    };

    const complianceScores = inspections
      .filter(i => i.overallCompliance)
      .map(i => i.overallCompliance);

    if (complianceScores.length > 0) {
      metrics.avgCompliance = Math.round(
        complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length
      );
    }

    res.status(200).json({
      success: true,
      data: {
        inspections,
        metrics
      }
    });
  } catch (error) {
    logger.error(`Get inspections report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error generating inspections report',
      error: error.message
    });
  }
};

// @desc    Get overdue items report
// @route   GET /api/reports/overdue
// @access  Private (Admin)
exports.getOverdueReport = async (req, res) => {
  try {
    const now = new Date();

    // Overdue applications
    const overdueApplications = await Application.find({
      $or: [
        { 'deadlines.inspection': { $lt: now }, status: 'inspection_scheduled' },
        { 'deadlines.followUp': { $lt: now }, status: 'follow_up_required' }
      ]
    }).populate('applicant', 'name email phone')
      .populate('assignedTo', 'name email');

    // Expiring licenses (next 30 days)
    const expiringLicenses = await License.find({
      status: 'active',
      validUntil: {
        $gte: now,
        $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    }).populate('licensee', 'name email phone');

    res.status(200).json({
      success: true,
      data: {
        overdueApplications,
        expiringLicenses
      }
    });
  } catch (error) {
    logger.error(`Get overdue report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error generating overdue report',
      error: error.message
    });
  }
};