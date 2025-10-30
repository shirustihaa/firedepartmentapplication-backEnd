const mongoose = require('mongoose');

const nocSchema = new mongoose.Schema({
  nocNumber: {
    type: String,
    unique: true,
    required: true
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyDetails: {
    propertyName: String,
    propertyType: String,
    address: Object
  },
  nocType: {
    type: String,
    enum: ['construction', 'occupancy', 'event', 'renovation'],
    required: true
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  conditions: [String],
  restrictions: [String],
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked', 'suspended'],
    default: 'active'
  },
  certificateUrl: String,
  remarks: String
}, {
  timestamps: true
});

// Generate unique NOC number
nocSchema.pre('save', async function(next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.nocNumber = `NOC${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Check if NOC is expired
nocSchema.methods.isExpired = function() {
  return new Date() > this.validUntil;
};

// Index for faster queries
nocSchema.index({ nocNumber: 1 });
nocSchema.index({ application: 1 });
nocSchema.index({ applicant: 1 });

module.exports = mongoose.model('NOC', nocSchema);