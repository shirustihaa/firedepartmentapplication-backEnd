const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  licenseNumber: {
    type: String,
    unique: true,
    required: true
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  licensee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  licenseType: {
    type: String,
    enum: ['fire_safety', 'occupancy', 'business', 'event'],
    required: true
  },
  propertyDetails: {
    propertyName: String,
    propertyType: String,
    address: Object
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
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'revoked', 'renewal_pending'],
    default: 'active'
  },
  conditions: [String],
  restrictions: [String],
  certificateUrl: String,
  renewalHistory: [{
    renewedDate: Date,
    previousExpiryDate: Date,
    newExpiryDate: Date,
    renewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  fees: {
    amount: Number,
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'paid'
    },
    paymentDate: Date,
    transactionId: String
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  remarks: String
}, {
  timestamps: true
});

// Generate unique license number
licenseSchema.pre('save', async function(next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.licenseNumber = `LIC${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Check if license is about to expire (within renewal reminder days)
licenseSchema.methods.needsRenewalReminder = function() {
  const reminderDays = parseInt(process.env.LICENSE_RENEWAL_REMINDER_DAYS || 30);
  const daysUntilExpiry = Math.ceil((this.validUntil - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= reminderDays && daysUntilExpiry > 0 && !this.reminderSent;
};

// Check if license is expired
licenseSchema.methods.isExpired = function() {
  return new Date() > this.validUntil;
};

// Index for faster queries
licenseSchema.index({ licenseNumber: 1 });
licenseSchema.index({ application: 1 });
licenseSchema.index({ licensee: 1 });
licenseSchema.index({ validUntil: 1 });
licenseSchema.index({ status: 1 });

module.exports = mongoose.model('License', licenseSchema);
