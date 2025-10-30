const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  inspectionDate: {
    type: Date,
    required: true
  },
  inspector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'rescheduled'],
    default: 'scheduled'
  },
  checklistItems: [{
    item: String,
    category: {
      type: String,
      enum: ['fire_safety', 'electrical', 'structural', 'emergency_exits', 'fire_extinguishers', 'alarms']
    },
    status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'not_applicable']
    },
    remarks: String,
    photos: [String]
  }],
  overallCompliance: {
    type: Number,
    min: 0,
    max: 100
  },
  findings: {
    compliant: [String],
    nonCompliant: [String],
    recommendations: [String]
  },
  requiresFollowUp: {
    type: Boolean,
    default: false
  },
  followUpDeadline: Date,
  inspectorRemarks: String,
  inspectionReport: {
    url: String,
    generatedAt: Date
  },
  completedAt: Date
}, {
  timestamps: true
});

// Automatically set follow-up deadline if required
inspectionSchema.pre('save', function(next) {
  if (this.requiresFollowUp && !this.followUpDeadline) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + parseInt(process.env.FOLLOWUP_DEADLINE_DAYS || 5));
    this.followUpDeadline = deadline;
  }
  next();
});

module.exports = mongoose.model('Inspection', inspectionSchema);