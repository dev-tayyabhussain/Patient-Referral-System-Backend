const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Clinic = require('../models/Clinic');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private (Super Admin, Hospital Admin)
const getDoctors = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10, specialization, hospitalId } = req.query;
        const user = req.user;

        const filter = { role: 'doctor' };

        // Hospital admin can only see doctors in their hospital
        if (user.role === 'hospital' && user.hospitalId) {
            filter.hospitalId = user.hospitalId;
        }

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

        // Filter by specialization
        if (specialization && specialization !== 'all') {
            filter.specialization = { $regex: specialization, $options: 'i' };
        }

        // Add search functionality
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { specialization: { $regex: search, $options: 'i' } },
                { licenseNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const doctors = await User.find(filter)
            .populate('hospitalId', 'name address')
            .populate('clinicId', 'name address')
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(filter);

        // Get statistics
        const stats = {
            total: await User.countDocuments({ role: 'doctor', ...(user.role === 'hospital' && user.hospitalId ? { hospitalId: user.hospitalId } : {}) }),
            active: await User.countDocuments({
                role: 'doctor',
                approvalStatus: 'approved',
                isActive: true,
                ...(user.role === 'hospital' && user.hospitalId ? { hospitalId: user.hospitalId } : {})
            }),
            pending: await User.countDocuments({
                role: 'doctor',
                approvalStatus: 'pending',
                ...(user.role === 'hospital' && user.hospitalId ? { hospitalId: user.hospitalId } : {})
            })
        };

        res.json({
            success: true,
            data: {
                doctors,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                },
                stats
            }
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctors',
            error: error.message
        });
    }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Private (Super Admin, Hospital Admin, Doctor)
const getDoctorById = async (req, res) => {
    try {
        const doctor = await User.findById(req.params.id)
            .populate('hospitalId', 'name address')
            .populate('clinicId', 'name address')
            .select('-password');

        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        // Check access permissions
        const user = req.user;
        if (user.role === 'hospital' && user.hospitalId && doctor.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: doctor });
    } catch (error) {
        console.error('Get doctor by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctor',
            error: error.message
        });
    }
};

// @desc    Create doctor
// @route   POST /api/doctors
// @access  Private (Super Admin, Hospital Admin)
const createDoctor = async (req, res) => {
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
            practiceType,
            clinicName,
            clinicAddress,
            clinicPhone,
            clinicEmail,
            clinicWebsite,
            clinicDescription,
            licenseNumber,
            specialization,
            yearsOfExperience,
            qualification
        } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hospital admin can only create doctors for their hospital
        let finalHospitalId = hospitalId;
        if (user.role === 'hospital' && user.hospitalId) {
            finalHospitalId = user.hospitalId;
        }

        // Validate practice type
        if (!practiceType || !['own_clinic', 'hospital'].includes(practiceType)) {
            return res.status(400).json({
                success: false,
                message: 'Practice type must be either "own_clinic" or "hospital"'
            });
        }

        // If hospital practice, hospitalId is required
        if (practiceType === 'hospital' && !finalHospitalId) {
            return res.status(400).json({
                success: false,
                message: 'Hospital ID is required for hospital practice type'
            });
        }

        // Create user
        const doctorData = {
            firstName,
            lastName,
            email,
            password,
            phone,
            dateOfBirth,
            gender,
            address,
            role: 'doctor',
            practiceType,
            licenseNumber,
            specialization,
            yearsOfExperience,
            qualification,
            approvalStatus: 'pending',
            isActive: true
        };

        if (practiceType === 'hospital') {
            doctorData.hospitalId = finalHospitalId;
        }

        const doctor = new User(doctorData);
        await doctor.save();

        // If own clinic, create clinic
        if (practiceType === 'own_clinic') {
            const Clinic = require('../models/Clinic');
            const clinic = new Clinic({
                name: clinicName,
                address: clinicAddress,
                phone: clinicPhone,
                email: clinicEmail || email,
                website: clinicWebsite,
                description: clinicDescription,
                ownerId: doctor._id
            });
            await clinic.save();
            doctor.clinicId = clinic._id;
            await doctor.save();
        }

        const createdDoctor = await User.findById(doctor._id)
            .populate('hospitalId', 'name address')
            .populate('clinicId', 'name address')
            .select('-password');

        res.status(201).json({
            success: true,
            message: 'Doctor created successfully. Awaiting approval.',
            data: createdDoctor
        });
    } catch (error) {
        console.error('Create doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating doctor',
            error: error.message
        });
    }
};

module.exports = {
    getDoctors,
    getDoctorById,
    createDoctor
};

