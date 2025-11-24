const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    // Referral Information
    referralId: {
        type: String,
        unique: true,
        required: true
    },

    // Patient Information
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Patient is required']
    },

    // Referring Information
    referringDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Referring doctor is required']
    },
    referringHospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: [true, 'Referring hospital is required']
    },

    // Receiving Information
    receivingDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receivingHospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: [true, 'Receiving hospital is required']
    },

    // Referral Details
    reason: {
        type: String,
        required: [true, 'Referral reason is required'],
        maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    specialty: {
        type: String,
        required: [true, 'Specialty is required']
    },

    // Clinical Information
    chiefComplaint: {
        type: String,
        required: [true, 'Chief complaint is required'],
        maxlength: [500, 'Chief complaint cannot exceed 500 characters']
    },
    historyOfPresentIllness: {
        type: String,
        maxlength: [2000, 'History cannot exceed 2000 characters']
    },
    physicalExamination: {
        type: String,
        maxlength: [2000, 'Physical examination cannot exceed 2000 characters']
    },
    vitalSigns: {
        bloodPressure: String,
        heartRate: Number,
        temperature: Number,
        respiratoryRate: Number,
        oxygenSaturation: Number,
        weight: Number,
        height: Number
    },
    diagnosis: {
        primary: String,
        secondary: [String]
    },
    treatmentGiven: {
        type: String,
        maxlength: [1000, 'Treatment given cannot exceed 1000 characters']
    },
    medications: [{
        name: String,
        dosage: String,
        frequency: String,
        duration: String
    }],

    // Investigation Results
    investigations: [{
        type: String,
        result: String,
        date: Date,
        file: String // Cloudinary URL
    }],

    // Referral Status
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },

    // Response Information
    response: {
        notes: String,
        responseDate: Date,
        responseBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Appointment Information
    appointment: {
        scheduledDate: Date,
        scheduledTime: String,
        location: String,
        notes: String
    },

    // Follow-up Information
    followUp: {
        required: {
            type: Boolean,
            default: false
        },
        date: Date,
        notes: String
    },

    // Files and Attachments
    attachments: [{
        name: String,
        url: String, // Cloudinary URL
        type: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // PDF Report
    pdfReport: {
        url: String, // Cloudinary URL
        generatedAt: Date
    },

    // Timeline
    timeline: [{
        action: {
            type: String,
            enum: ['created', 'sent', 'received', 'accepted', 'rejected', 'completed', 'cancelled']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String
    }],

    // Communication
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            required: true,
            maxlength: [1000, 'Message cannot exceed 1000 characters']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        isRead: {
            type: Boolean,
            default: false
        }
    }],

    // Expiry
    expiresAt: {
        type: Date,
        default: function () {
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
    }
}, {
    timestamps: true
});

// Indexes for better query performance
referralSchema.index({ referralId: 1 });
referralSchema.index({ patient: 1 });
referralSchema.index({ referringDoctor: 1 });
referralSchema.index({ referringHospital: 1 });
referralSchema.index({ receivingHospital: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ priority: 1 });
referralSchema.index({ specialty: 1 });
referralSchema.index({ createdAt: -1 });

// Method to generate referral ID
referralSchema.statics.generateReferralId = function () {
    const prefix = 'REF';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
};

// Pre-save middleware to generate referral ID
referralSchema.pre('save', function (next) {
    if (!this.referralId) {
        this.referralId = this.constructor.generateReferralId();
    }
    next();
});

// Method to add timeline entry
referralSchema.methods.addTimelineEntry = function (action, performedBy, notes = '') {
    this.timeline.push({
        action,
        performedBy,
        notes,
        timestamp: new Date()
    });
    return this.save();
};

// Method to add message
referralSchema.methods.addMessage = function (sender, message) {
    this.messages.push({
        sender,
        message,
        timestamp: new Date()
    });
    return this.save();
};

// Method to check if referral is expired
referralSchema.methods.isExpired = function () {
    return new Date() > this.expiresAt;
};

// Method to get unread messages count
referralSchema.methods.getUnreadMessagesCount = function (userId) {
    return this.messages.filter(msg =>
        msg.sender.toString() !== userId.toString() && !msg.isRead
    ).length;
};

// Virtual for referral age in days
referralSchema.virtual('ageInDays').get(function () {
    const now = new Date();
    const created = new Date(this.createdAt);
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Referral', referralSchema);
