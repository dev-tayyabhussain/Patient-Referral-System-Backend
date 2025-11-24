const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Clinic name is required'],
        trim: true,
        maxlength: [100, 'Clinic name cannot exceed 100 characters']
    },
    address: {
        street: {
            type: String,
            required: [true, 'Street address is required'],
            trim: true,
            maxlength: [200, 'Street address cannot exceed 200 characters']
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true,
            maxlength: [50, 'City cannot exceed 50 characters']
        },
        state: {
            type: String,
            required: [true, 'State is required'],
            trim: true,
            maxlength: [50, 'State cannot exceed 50 characters']
        },
        zipCode: {
            type: String,
            required: [true, 'ZIP code is required'],
            trim: true,
            maxlength: [10, 'ZIP code cannot exceed 10 characters']
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            maxlength: [50, 'Country cannot exceed 50 characters'],
            default: 'USA'
        }
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    email: {
        type: String,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    // Reference to the doctor who owns this clinic
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for better query performance
clinicSchema.index({ ownerId: 1 });
clinicSchema.index({ name: 1 });
clinicSchema.index({ 'address.city': 1 });
clinicSchema.index({ 'address.state': 1 });

// Virtual for full address
clinicSchema.virtual('fullAddress').get(function () {
    const addr = this.address;
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

module.exports = mongoose.model('Clinic', clinicSchema);


