const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../config/email');

// Create hospital (public registration or super admin)
const createHospital = async (req, res) => {
    try {
        const hospitalData = req.body;
        const isSuperAdmin = req.user && req.user.role === 'super_admin';

        // Check if hospital with same email already exists
        const existingHospital = await Hospital.findOne({ email: hospitalData.email });
        if (existingHospital) {
            return res.status(400).json({
                success: false,
                message: 'Hospital with this email already exists'
            });
        }

        // Determine status: super admin can set it, otherwise default to 'pending'
        const status = (isSuperAdmin && hospitalData.status) ? hospitalData.status : 'pending';

        // Create hospital
        const hospital = new Hospital({
            ...hospitalData,
            status: status
        });

        await hospital.save();

        // Create hospital user if admin details are provided
        let hospitalUser = null;
        if (hospitalData.firstName && hospitalData.lastName && hospitalData.password) {
            hospitalUser = new User({
                firstName: hospitalData.firstName,
                lastName: hospitalData.lastName,
                email: hospitalData.email,
                password: hospitalData.password,
                phone: hospitalData.phone,
                role: 'hospital',
                hospitalId: hospital._id,
                approvalStatus: status === 'approved' ? 'approved' : 'pending'
            });

            await hospitalUser.save();
        }

        res.status(201).json({
            success: true,
            message: isSuperAdmin
                ? `Hospital created successfully${status === 'approved' ? ' and approved' : ''}.`
                : 'Hospital registered successfully. Awaiting approval.',
            data: {
                hospital: hospital,
                userId: hospitalUser?._id || null
            }
        });
    } catch (error) {
        console.error('Create hospital error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating hospital',
            error: error.message
        });
    }
};

// Get all hospitals (super admin)
const getHospitals = async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search } = req.query;

        const filter = {};
        if (status) {
            filter.status = status;
        }

        // Add search functionality
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { 'address.city': { $regex: search, $options: 'i' } },
                { 'address.state': { $regex: search, $options: 'i' } },
                { 'address.street': { $regex: search, $options: 'i' } }
            ];
        }

        const hospitals = await Hospital.find(filter)
            .populate('approvedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Hospital.countDocuments(filter);

        res.json({
            success: true,
            data: {
                hospitals,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hospitals',
            error: error.message
        });
    }
};

// Get hospital by ID
const getHospitalById = async (req, res) => {
    try {
        const { id } = req.params;

        const hospital = await Hospital.findById(id)
            .populate('approvedBy', 'firstName lastName');

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: 'Hospital not found'
            });
        }

        res.json({
            success: true,
            data: hospital
        });
    } catch (error) {
        console.error('Get hospital by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hospital',
            error: error.message
        });
    }
};

// Update hospital
const updateHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const hospital = await Hospital.findById(id);
        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: 'Hospital not found'
            });
        }

        // Check if user has permission to update this hospital
        if (req.user.role === 'hospital' && hospital._id.toString() !== req.user.hospitalId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this hospital'
            });
        }

        // Remove empty string values for optional fields
        if (updateData.website === '') {
            updateData.website = undefined;
        }
        if (updateData.description === '') {
            updateData.description = undefined;
        }

        const updatedHospital = await Hospital.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('approvedBy', 'firstName lastName');

        res.json({
            success: true,
            message: 'Hospital updated successfully',
            data: updatedHospital
        });
    } catch (error) {
        console.error('Update hospital error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating hospital',
            error: error.message
        });
    }
};

// Delete hospital
const deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteUsers = false } = req.body; // Option to delete associated users

        const hospital = await Hospital.findById(id);
        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: 'Hospital not found'
            });
        }

        // Check if hospital has any users (doctors or hospital users)
        const associatedUsers = await User.find({
            $or: [
                { hospitalId: id },
                { role: 'hospital', hospitalId: id }
            ]
        });

        if (associatedUsers.length > 0) {
            if (!deleteUsers) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete hospital with ${associatedUsers.length} associated user(s). Please remove all associated users first, or set deleteUsers=true to delete them along with the hospital.`,
                    associatedUsersCount: associatedUsers.length
                });
            }

            // Delete all associated users if deleteUsers is true
            const userIds = associatedUsers.map(user => user._id);
            await User.deleteMany({ _id: { $in: userIds } });
        }

        // Delete the hospital
        await Hospital.findByIdAndDelete(id);

        res.json({
            success: true,
            message: `Hospital and ${associatedUsers.length > 0 ? associatedUsers.length + ' associated user(s) ' : ''}deleted successfully`
        });
    } catch (error) {
        console.error('Delete hospital error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting hospital',
            error: error.message
        });
    }
};

// Get approved hospitals (public)
const getApprovedHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find({
            status: 'approved',
            isActive: true
        }).select('name address specialties capacity services website description');

        res.json({
            success: true,
            data: hospitals
        });
    } catch (error) {
        console.error('Get approved hospitals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching approved hospitals',
            error: error.message
        });
    }
};

module.exports = {
    createHospital,
    getHospitals,
    getHospitalById,
    updateHospital,
    deleteHospital,
    getApprovedHospitals
};
