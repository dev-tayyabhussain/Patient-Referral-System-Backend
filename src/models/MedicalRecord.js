const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    // Patient Information
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Patient is required']
    },

    // Record Information
    recordId: {
        type: String,
        unique: true,
        required: true
    },

    // Visit Information
    visitDate: {
        type: Date,
        required: [true, 'Visit date is required'],
        default: Date.now
    },
    visitType: {
        type: String,
        enum: ['consultation', 'procedure', 'test', 'vaccination', 'emergency', 'follow-up', 'other'],
        required: [true, 'Visit type is required']
    },

    // Healthcare Provider Information
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Doctor is required']
    },
    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: [true, 'Hospital is required']
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

    // Vital Signs
    vitalSigns: {
        bloodPressure: String,
        heartRate: Number,
        temperature: Number,
        respiratoryRate: Number,
        oxygenSaturation: Number,
        weight: Number,
        height: Number,
        bmi: Number
    },

    // Diagnosis
    diagnosis: {
        primary: {
            type: String,
            required: [true, 'Primary diagnosis is required']
        },
        secondary: [String],
        icdCodes: [String]
    },

    // Treatment
    treatment: {
        type: String,
        required: [true, 'Treatment is required'],
        maxlength: [1000, 'Treatment cannot exceed 1000 characters']
    },
    procedures: [{
        name: String,
        date: Date,
        notes: String
    }],

    // Medications
    medications: [{
        name: {
            type: String,
            required: true
        },
        dosage: String,
        frequency: String,
        duration: String,
        startDate: Date,
        endDate: Date,
        instructions: String
    }],

    // Lab Results
    labResults: [{
        testName: String,
        result: String,
        unit: String,
        normalRange: String,
        date: Date,
        status: {
            type: String,
            enum: ['normal', 'abnormal', 'critical']
        }
    }],

    // Imaging/Investigations
    investigations: [{
        type: String,
        result: String,
        date: Date,
        notes: String
    }],

    // Attachments
    attachments: [{
        name: String,
        url: String, // Cloudinary URL
        type: {
            type: String,
            enum: ['lab_report', 'imaging', 'prescription', 'discharge_summary', 'other']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // Follow-up
    followUp: {
        required: {
            type: Boolean,
            default: false
        },
        date: Date,
        notes: String,
        completed: {
            type: Boolean,
            default: false
        }
    },

    // Referral Link
    referral: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Referral'
    },

    // Notes
    doctorNotes: {
        type: String,
        maxlength: [2000, 'Doctor notes cannot exceed 2000 characters']
    },
    nurseNotes: {
        type: String,
        maxlength: [1000, 'Nurse notes cannot exceed 1000 characters']
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'completed', 'reviewed', 'archived'],
        default: 'completed'
    },

    // Billing
    billing: {
        totalCost: Number,
        insuranceCovered: Number,
        patientPaid: Number,
        status: {
            type: String,
            enum: ['pending', 'paid', 'partially_paid', 'insurance_claimed']
        }
    }
}, {
    timestamps: true
});

// Indexes for better query performance
medicalRecordSchema.index({ recordId: 1 });
medicalRecordSchema.index({ patient: 1 });
medicalRecordSchema.index({ doctor: 1 });
medicalRecordSchema.index({ hospital: 1 });
medicalRecordSchema.index({ visitDate: -1 });
medicalRecordSchema.index({ specialty: 1 });
medicalRecordSchema.index({ status: 1 });
medicalRecordSchema.index({ createdAt: -1 });

// Method to generate record ID
medicalRecordSchema.statics.generateRecordId = function () {
    const prefix = 'MR';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
};

// Pre-save middleware to generate record ID
medicalRecordSchema.pre('save', function (next) {
    if (!this.recordId) {
        this.recordId = this.constructor.generateRecordId();
    }

    // Calculate BMI if height and weight are provided
    if (this.vitalSigns?.height && this.vitalSigns?.weight) {
        const heightInMeters = this.vitalSigns.height / 100;
        this.vitalSigns.bmi = (this.vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(2);
    }

    next();
});

// Virtual for record age in days
medicalRecordSchema.virtual('ageInDays').get(function () {
    const now = new Date();
    const created = new Date(this.visitDate);
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
