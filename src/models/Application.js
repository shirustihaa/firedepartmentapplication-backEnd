const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicationNumber: {
    type: String,
    unique: true,
    required: true
  },
  applicationType: {
    type: String,
    enum: ['fire_inspection', 'noc', 'license', 'renewal'],
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyDetails: {
    propertyName: {
      type: String,
      required: true
    },
    propertyType: {
      type: String,
      enum: ['residential', 'commercial', 'industrial', 'institutional'],
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    },
    plotArea: Number,
    builtUpArea: Number,
    numberOfFloors: Number
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'inspection_scheduled',
      'inspection_completed',
      'follow_up_required',
      'follow_up_completed',
      'approved',
      'rejected',
      'noc_issued',
      //'license_issued'
    ],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  inspection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inspection'
  },
  noc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NOC'
  },
  //license: {
    //type: mongoose.Schema.Types.ObjectId,
    //ref: 'License'
  //},
  timeline: [{
    status: String,
    timestamp: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    remarks: String
  }],
  remarks: String,
  rejectionReason: String,
  deadlines: {
    inspection: Date,
    followUp: Date,
    finalDecision: Date
  },
  isOverdue: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate unique application number
applicationSchema.pre('save', async function(next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.applicationNumber = `FD${year}${String(count + 1).padStart(6, '0')}`;
    
    // Add submission to timeline
    this.timeline.push({
      status: 'submitted',
      timestamp: new Date(),
      updatedBy: this.applicant,
      remarks: 'Application submitted'
    });
  }
  next();
});

// Index for faster queries
applicationSchema.index({ applicationNumber: 1 });
applicationSchema.index({ applicant: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);