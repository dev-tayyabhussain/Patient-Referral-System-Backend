const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    // Personal Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: [true, 'Gender is required']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    email: {
        type: String,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },

    // Identification
    nationalId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    patientId: {
        type: String,
        unique: true,
        required: true
    },

    // Address Information
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: 'Nigeria'
        }
    },

    // Emergency Contact
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
    },

    // Medical Information
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    allergies: [{
        allergen: String,
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe']
        },
        notes: String
    }],
    chronicConditions: [{
        condition: String,
        diagnosisDate: Date,
        status: {
            type: String,
            enum: ['active', 'controlled', 'inactive']
        },
        notes: String
    }],
    medications: [{
        name: String,
        dosage: String,
        frequency: String,
        startDate: Date,
        endDate: Date,
        prescribedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // Insurance Information
    insurance: {
        provider: String,
        policyNumber: String,
        groupNumber: String,
        expiryDate: Date
    },

    // Status and Preferences
    status: {
        type: String,
        enum: ['active', 'inactive', 'deceased'],
        default: 'active'
    },
    preferredLanguage: {
        type: String,
        default: 'English'
    },

    // Medical History
    medicalHistory: [{
        date: Date,
        type: {
            type: String,
            enum: ['consultation', 'procedure', 'test', 'vaccination', 'other']
        },
        description: String,
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital'
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        files: [String] // Cloudinary URLs
    }],

    // Current Hospital Assignment
    currentHospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital'
    },
    assignedDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Profile Image
    profileImage: {
        type: String, // Cloudinary URL
        default: null
    },

    // Statistics
    stats: {
        totalVisits: {
            type: Number,
            default: 0
        },
        totalReferrals: {
            type: Number,
            default: 0
        },
        lastVisit: Date
    }
}, {
    timestamps: true
});

// Indexes for better query performance
patientSchema.index({ patientId: 1 });
patientSchema.index({ nationalId: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ currentHospital: 1 });
patientSchema.index({ assignedDoctor: 1 });
patientSchema.index({ 'address.city': 1 });
patientSchema.index({ 'address.state': 1 });

// Virtual for full name
patientSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function () {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
});

// Method to generate patient ID
patientSchema.statics.generatePatientId = function () {
    const prefix = 'PAT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
};

// Pre-save middleware to generate patient ID
patientSchema.pre('save', function (next) {
    if (!this.patientId) {
        this.patientId = this.constructor.generatePatientId();
    }
    next();
});

// Method to get active medications
patientSchema.methods.getActiveMedications = function () {
    const now = new Date();
    return this.medications.filter(med =>
        (!med.endDate || med.endDate > now) && med.startDate <= now
    );
};

// Method to get active chronic conditions
patientSchema.methods.getActiveChronicConditions = function () {
    return this.chronicConditions.filter(condition =>
        condition.status === 'active'
    );
};

module.exports = mongoose.model('Patient', patientSchema);
