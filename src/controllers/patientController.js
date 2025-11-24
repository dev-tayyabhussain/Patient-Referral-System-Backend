const User = require('../models/User');
const Hospital = require('../models/Hospital');
const crypto = require('crypto');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private (All authenticated users)
const getPatients = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10, hospitalId } = req.query;
        const user = req.user;

        const filter = { role: 'patient' };

        // Hospital admin can only see patients in their hospital
        if (user.role === 'hospital' && user.hospitalId) {
            filter.hospitalId = user.hospitalId;
        }

        // Doctor can see their patients (if we add a doctorId field to patients later)
        // For now, doctors can see all patients

        // Super admin can filter by hospital
        if (user.role === 'super_admin' && hospitalId) {
            filter.hospitalId = hospitalId;
        }

        // Filter by approval status
        if (status && status !== 'all') {
            if (status === 'active') {
                filter.approvalStatus = 'approved';
                filter.isActive = true;
            } else if (status === 'inactive') {
                filter.isActive = false;
            } else {
                filter.approvalStatus = status;
            }
        }

        // Add search functionality
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const patients = await User.find(filter)
            .populate('hospitalId', 'name address')
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(filter);

        // Get statistics
        const baseFilter = { role: 'patient', ...(user.role === 'hospital' && user.hospitalId ? { hospitalId: user.hospitalId } : {}) };
        const stats = {
            total: await User.countDocuments(baseFilter),
            active: await User.countDocuments({
                ...baseFilter,
                approvalStatus: 'approved',
                isActive: true
            }),
            pending: await User.countDocuments({
                ...baseFilter,
                approvalStatus: 'pending'
            })
        };

        res.json({
            success: true,
            data: {
                patients,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                },
                stats
            }
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patients',
            error: error.message
        });
    }
};

// @desc    Get patient by ID
// @route   GET /api/patients/:id
// @access  Private (All authenticated users)
const getPatientById = async (req, res) => {
    try {
        const patient = await User.findById(req.params.id)
            .populate('hospitalId', 'name address')
            .select('-password');

        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Check access permissions
        const user = req.user;
        if (user.role === 'hospital' && user.hospitalId && patient.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: patient });
    } catch (error) {
        console.error('Get patient by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient',
            error: error.message
        });
    }
};

// @desc    Create patient
// @route   POST /api/patients
// @access  Private (Super Admin, Hospital Admin, Doctor)
const createPatient = async (req, res) => {
    try {
        const user = req.user;
        const {
            firstName,
            lastName,
            email,
            password,
            phone,
            dateOfBirth,
            gender,
            address,
            hospitalId,
            bloodType,
            allergies,
            chronicConditions,
            emergencyContact,
            emergencyPhone
        } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Validate required fields
        if (!firstName || !lastName || !email) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, and email are required'
            });
        }

        // Validate gender if provided (must be valid enum or undefined)
        if (gender && gender !== '' && !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: 'Gender must be male, female, or other'
            });
        }

        // Hospital admin can only create patients for their hospital
        let finalHospitalId = hospitalId;
        if (user.role === 'hospital' && user.hospitalId) {
            finalHospitalId = user.hospitalId;
        }

        // Handle emergencyContact - convert object to string if needed
        let emergencyContactString = '';
        if (emergencyContact) {
            if (typeof emergencyContact === 'object') {
                // Format: "Name (Relationship) - Phone - Email"
                const parts = [];
                if (emergencyContact.name) parts.push(emergencyContact.name);
                if (emergencyContact.relationship) parts.push(`(${emergencyContact.relationship})`);
                if (emergencyContact.phone) parts.push(`- ${emergencyContact.phone}`);
                if (emergencyContact.email) parts.push(`- ${emergencyContact.email}`);
                emergencyContactString = parts.join(' ');
            } else {
                emergencyContactString = emergencyContact;
            }
        }

        // Use emergencyPhone from request or from emergencyContact object
        const finalEmergencyPhone = emergencyPhone || (typeof emergencyContact === 'object' ? emergencyContact.phone : '');

        if (!finalEmergencyPhone) {
            return res.status(400).json({
                success: false,
                message: 'Emergency phone is required'
            });
        }

        // Create user
        const patientData = {
            firstName,
            lastName,
            email,
            password: password || crypto.randomBytes(8).toString('hex'), // Generate random password if not provided
            phone: phone || undefined,
            dateOfBirth: dateOfBirth || undefined,
            gender: (gender && gender !== '') ? gender : undefined,
            address: address || {},
            role: 'patient',
            hospitalId: finalHospitalId,
            bloodType: bloodType || undefined,
            allergies: allergies || [],
            chronicConditions: chronicConditions || [],
            emergencyContact: emergencyContactString,
            emergencyPhone: finalEmergencyPhone,
            approvalStatus: 'approved', // Patients are auto-approved
            isActive: true
        };

        const patient = new User(patientData);
        await patient.save();

        const createdPatient = await User.findById(patient._id)
            .populate('hospitalId', 'name address')
            .select('-password');

        res.status(201).json({
            success: true,
            message: 'Patient created successfully',
            data: createdPatient
        });
    } catch (error) {
        console.error('Create patient error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating patient',
            error: error.message
        });
    }
};

// @desc    Get patient profile with full details
// @route   GET /api/patients/:id/profile
// @access  Private (All authenticated users)
const getPatientProfile = async (req, res) => {
    try {
        const patient = await User.findById(req.params.id)
            .populate('hospitalId', 'name address phone email')
            .select('-password');

        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Check access permissions
        const user = req.user;
        if (user.role === 'hospital' && user.hospitalId && patient.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: patient });
    } catch (error) {
        console.error('Get patient profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient profile',
            error: error.message
        });
    }
};

// @desc    Get patient referrals
// @route   GET /api/patients/:id/referrals
// @access  Private (All authenticated users)
const getPatientReferrals = async (req, res) => {
    try {
        const Referral = require('../models/Referral');
        const patient = await User.findById(req.params.id);

        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Check access permissions
        const user = req.user;
        if (user.role === 'hospital' && user.hospitalId && patient.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Find referrals - Note: Referral model uses 'patient' field, not 'patientId'
        // We need to check both User model and Patient model
        const Patient = require('../models/Patient');
        const patientRecord = await Patient.findOne({
            $or: [
                { email: patient.email },
                { phone: patient.phone }
            ]
        });

        let referrals = [];
        if (patientRecord) {
            referrals = await Referral.find({ patient: patientRecord._id })
                .populate('referringDoctor', 'firstName lastName specialization')
                .populate('referringHospital', 'name address')
                .populate('receivingDoctor', 'firstName lastName specialization')
                .populate('receivingHospital', 'name address')
                .sort({ createdAt: -1 });
        }

        res.json({
            success: true,
            data: {
                referrals,
                count: referrals.length
            }
        });
    } catch (error) {
        console.error('Get patient referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient referrals',
            error: error.message
        });
    }
};

// @desc    Get patient medical history
// @route   GET /api/patients/:id/medical-history
// @access  Private (All authenticated users)
const getPatientMedicalHistory = async (req, res) => {
    try {
        const patient = await User.findById(req.params.id);

        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Check access permissions
        const user = req.user;
        if (user.role === 'hospital' && user.hospitalId && patient.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Get medical history from Patient model if exists
        const Patient = require('../models/Patient');
        const patientRecord = await Patient.findOne({
            $or: [
                { email: patient.email },
                { phone: patient.phone }
            ]
        });

        const medicalHistory = patientRecord?.medicalHistory || [];
        const medications = patientRecord?.medications || [];
        const allergies = patientRecord?.allergies || [];
        const chronicConditions = patientRecord?.chronicConditions || [];

        res.json({
            success: true,
            data: {
                medicalHistory,
                medications,
                allergies,
                chronicConditions,
                bloodType: patientRecord?.bloodType || patient.bloodType,
                stats: patientRecord?.stats || {}
            }
        });
    } catch (error) {
        console.error('Get patient medical history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient medical history',
            error: error.message
        });
    }
};

module.exports = {
    getPatients,
    getPatientById,
    createPatient,
    getPatientProfile,
    getPatientReferrals,
    getPatientMedicalHistory
};

