const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Clinic = require('../models/Clinic');
const Referral = require('../models/Referral');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private (Super Admin, Hospital Admin)
const getDoctors = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10, specialization, hospitalId } = req.query;
        const user = req.user;

        const filter = { role: 'doctor' };

        // Allow explicit hospital filter for fetching specific hospital doctors
        if (hospitalId) {
            filter.hospitalId = hospitalId;
        } else if (user.role === 'hospital' && user.hospitalId) {
            // Default hospital admin scope
            filter.hospitalId = user.hospitalId;
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
        if (user.role === 'hospital' && user.hospitalId) {
            // Hospital admins can view:
            // 1. Doctors from their own hospital (regardless of approval status)
            // 2. Approved doctors from other hospitals (for referral purposes)
            // 3. Approved clinic doctors (doctors without hospitalId)
            const doctorHospitalId = doctor.hospitalId?.toString();
            const userHospitalId = user.hospitalId.toString();
            const isOwnHospitalDoctor = doctorHospitalId === userHospitalId;
            const isApprovedDoctorFromOtherHospital = doctorHospitalId && 
                                                     doctorHospitalId !== userHospitalId && 
                                                     doctor.approvalStatus === 'approved';
            const isApprovedClinicDoctor = !doctorHospitalId && doctor.approvalStatus === 'approved';
            
            if (!isOwnHospitalDoctor && !isApprovedDoctorFromOtherHospital && !isApprovedClinicDoctor) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied. You can only view doctors from your hospital or approved doctors from other hospitals.' 
                });
            }
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

// @desc    Get doctor's patients
// @route   GET /api/doctors/:id/patients
// @access  Private (Doctor, Hospital Admin)
const getDoctorPatients = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { page = 1, limit = 10, search, status } = req.query;

        // Check if doctor exists
        const doctor = await User.findById(id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        // Check permissions - doctor can only see their own patients, hospital admin can see their hospital's doctors' patients
        if (user.role === 'doctor' && user._id.toString() !== id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (user.role === 'hospital' && user.hospitalId && doctor.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Get patient IDs from referrals
        const referralFilter = {
            $or: [
                { referringDoctor: id },
                { receivingDoctor: id }
            ]
        };
        const patientIds = await Referral.distinct('patient', referralFilter);

        // Build query
        const query = {
            role: 'patient',
            _id: { $in: patientIds }
        };

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        if (status && status !== 'all') {
            query.isActive = status === 'active';
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const patients = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Add age calculation
        const patientsWithAge = patients.map(patient => {
            const age = patient.dateOfBirth 
                ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                : null;
            return { ...patient, age };
        });

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                patients: patientsWithAge,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get doctor patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctor patients',
            error: error.message
        });
    }
};

// @desc    Get doctor's referrals
// @route   GET /api/doctors/:id/referrals
// @access  Private (Doctor, Hospital Admin)
const getDoctorReferrals = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { page = 1, limit = 10, status, priority, search } = req.query;

        // Check if doctor exists
        const doctor = await User.findById(id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        // Check permissions
        if (user.role === 'doctor' && user._id.toString() !== id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (user.role === 'hospital' && user.hospitalId && doctor.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Build query
        const query = {
            $or: [
                { referringDoctor: id },
                { receivingDoctor: id }
            ]
        };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (priority && priority !== 'all') {
            query.priority = priority;
        }

        if (search) {
            query.$or = [
                ...query.$or,
                { referralId: { $regex: search, $options: 'i' } },
                { reason: { $regex: search, $options: 'i' } },
                { specialty: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const referrals = await Referral.find(query)
            .populate('patient', 'firstName lastName email phone')
            .populate('referringHospital', 'name address')
            .populate('receivingHospital', 'name address')
            .populate('referringDoctor', 'firstName lastName specialization')
            .populate('receivingDoctor', 'firstName lastName specialization')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Referral.countDocuments(query);

        // Calculate stats
        const stats = {
            total: await Referral.countDocuments(query),
            pending: await Referral.countDocuments({ ...query, status: 'pending' }),
            accepted: await Referral.countDocuments({ ...query, status: 'accepted' }),
            completed: await Referral.countDocuments({ ...query, status: 'completed' }),
            in_progress: await Referral.countDocuments({ ...query, status: 'in_progress' })
        };

        res.json({
            success: true,
            data: {
                referrals,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit)
                },
                stats
            }
        });
    } catch (error) {
        console.error('Get doctor referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctor referrals',
            error: error.message
        });
    }
};

// @desc    Get doctor's analytics
// @route   GET /api/doctors/:id/analytics
// @access  Private (Doctor, Hospital Admin)
const getDoctorAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { period = 30 } = req.query;

        // Check if doctor exists
        const doctor = await User.findById(id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        // Check permissions
        if (user.role === 'doctor' && user._id.toString() !== id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (user.role === 'hospital' && user.hospitalId && doctor.hospitalId?.toString() !== user.hospitalId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const referralFilter = {
            $or: [
                { referringDoctor: id },
                { receivingDoctor: id }
            ],
            createdAt: { $gte: startDate }
        };

        // Get referral trends
        const dailyTrends = await Referral.aggregate([
            { $match: referralFilter },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get referrals by status
        const statusCounts = await Referral.aggregate([
            { $match: referralFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get referrals by priority
        const priorityCounts = await Referral.aggregate([
            { $match: referralFilter },
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);

        // Get referrals by specialty
        const specialtyCounts = await Referral.aggregate([
            { $match: referralFilter },
            { $group: { _id: '$specialty', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get patient IDs from referrals
        const patientIds = await Referral.distinct('patient', {
            $or: [
                { referringDoctor: id },
                { receivingDoctor: id }
            ]
        });

        const totalPatients = await User.countDocuments({
            role: 'patient',
            _id: { $in: patientIds }
        });

        res.json({
            success: true,
            data: {
                dailyTrends: dailyTrends.map(item => ({
                    date: item._id,
                    count: item.count
                })),
                statusCounts: statusCounts.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                priorityCounts: priorityCounts.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                specialtyCounts: specialtyCounts.map(item => ({
                    specialty: item._id,
                    count: item.count
                })),
                totalPatients,
                totalReferrals: await Referral.countDocuments(referralFilter)
            }
        });
    } catch (error) {
        console.error('Get doctor analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctor analytics',
            error: error.message
        });
    }
};

module.exports = {
    getDoctors,
    getDoctorById,
    createDoctor,
    getDoctorPatients,
    getDoctorReferrals,
    getDoctorAnalytics
};

