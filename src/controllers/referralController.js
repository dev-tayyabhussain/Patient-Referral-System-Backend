const Referral = require('../models/Referral');
const User = require('../models/User');
const Hospital = require('../models/Hospital');

/**
 * Get all referrals with filtering, searching, and pagination
 */
const getReferrals = async (req, res) => {
    try {
        const user = req.user;
        const {
            status,
            priority,
            specialty,
            search,
            page = 1,
            limit = 10,
            hospitalId,
            patientId,
            doctorId
        } = req.query;

        const query = {};
        const orConditions = [];

        // Role-based filtering
        if (user.role === 'hospital' && user.hospitalId) {
            orConditions.push(
                { referringHospital: user.hospitalId },
                { receivingHospital: user.hospitalId }
            );
        } else if (user.role === 'doctor') {
            orConditions.push(
                { referringDoctor: user._id },
                { receivingDoctor: user._id }
            );
        } else if (user.role === 'patient') {
            query.patient = user._id;
        }

        // Additional filters
        if (status) {
            query.status = status;
        }
        if (priority) {
            query.priority = priority;
        }
        if (specialty) {
            query.specialty = specialty;
        }

        // Handle hospitalId filter (only for super_admin)
        if (hospitalId && user.role === 'super_admin') {
            orConditions.push(
                { referringHospital: hospitalId },
                { receivingHospital: hospitalId }
            );
        }

        if (patientId) {
            query.patient = patientId;
        }

        // Handle doctorId filter (only for super_admin)
        if (doctorId && user.role === 'super_admin') {
            orConditions.push(
                { referringDoctor: doctorId },
                { receivingDoctor: doctorId }
            );
        }

        // Search functionality - combine with existing $or conditions
        if (search) {
            const searchConditions = [
                { referralId: { $regex: search, $options: 'i' } },
                { reason: { $regex: search, $options: 'i' } },
                { chiefComplaint: { $regex: search, $options: 'i' } },
                { specialty: { $regex: search, $options: 'i' } }
            ];

            // If we have existing $or conditions, we need to combine them with $and
            if (orConditions.length > 0) {
                query.$and = [
                    { $or: orConditions },
                    { $or: searchConditions }
                ];
            } else {
                query.$or = searchConditions;
            }
        } else if (orConditions.length > 0) {
            // Only set $or if we have conditions and no search
            query.$or = orConditions;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const referrals = await Referral.find(query)
            .populate('patient', 'firstName lastName email phone dateOfBirth gender')
            .populate('referringDoctor', 'firstName lastName email specialization')
            .populate('referringHospital', 'name address')
            .populate('receivingDoctor', 'firstName lastName email specialization')
            .populate('receivingHospital', 'name address')
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
            cancelled: await Referral.countDocuments({ ...query, status: 'cancelled' }),
            byPriority: {
                low: await Referral.countDocuments({ ...query, priority: 'low' }),
                medium: await Referral.countDocuments({ ...query, priority: 'medium' }),
                high: await Referral.countDocuments({ ...query, priority: 'high' }),
                urgent: await Referral.countDocuments({ ...query, priority: 'urgent' })
            }
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
        console.error('Get referrals error:', error);
        res.status(500).json({ success: false, message: 'Error fetching referrals', error: error.message });
    }
};

/**
 * Get referral by ID
 */
const getReferralById = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const referral = await Referral.findById(id)
            .populate('patient', 'firstName lastName email phone dateOfBirth gender bloodType')
            .populate('referringDoctor', 'firstName lastName email specialization licenseNumber')
            .populate('referringHospital', 'name address phone email')
            .populate('receivingDoctor', 'firstName lastName email specialization')
            .populate('receivingHospital', 'name address phone email')
            .lean();

        if (!referral) {
            return res.status(404).json({ success: false, message: 'Referral not found' });
        }

        // Check access permissions
        if (user.role === 'hospital' && user.hospitalId) {
            if (referral.referringHospital?._id?.toString() !== user.hospitalId.toString() &&
                referral.receivingHospital?._id?.toString() !== user.hospitalId.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        } else if (user.role === 'doctor') {
            if (referral.referringDoctor?._id?.toString() !== user._id.toString() &&
                referral.receivingDoctor?._id?.toString() !== user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        } else if (user.role === 'patient') {
            if (referral.patient?._id?.toString() !== user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        res.json({ success: true, data: referral });
    } catch (error) {
        console.error('Get referral by ID error:', error);
        res.status(500).json({ success: false, message: 'Error fetching referral', error: error.message });
    }
};

/**
 * Create new referral
 */
const createReferral = async (req, res) => {
    try {
        const user = req.user;
        const {
            patientId,
            receivingHospitalId,
            receivingDoctorId,
            referringDoctorId,
            reason,
            priority,
            specialty,
            chiefComplaint,
            historyOfPresentIllness,
            physicalExamination,
            vitalSigns,
            diagnosis,
            treatmentPlan,
            notes
        } = req.body;

        // Validation
        if (!patientId || !receivingHospitalId || !reason || !specialty || !chiefComplaint) {
            return res.status(400).json({
                success: false,
                message: 'Patient, receiving hospital, reason, specialty, and chief complaint are required'
            });
        }

        // Check if patient exists
        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'patient') {
            return res.status(400).json({ success: false, message: 'Invalid patient ID' });
        }

        // Check if receiving hospital exists
        const receivingHospital = await Hospital.findById(receivingHospitalId);
        if (!receivingHospital) {
            return res.status(400).json({ success: false, message: 'Invalid receiving hospital ID' });
        }

        // Determine referring doctor and hospital
        let referringDoctor = null;
        let referringHospital = null;

        if (user.role === 'doctor') {
            referringDoctor = user._id;
            referringHospital = user.hospitalId || user.clinicId;
        } else if (user.role === 'hospital') {
            referringHospital = user.hospitalId;

            // If referringDoctorId is provided, use it
            if (referringDoctorId) {
                const specifiedDoctor = await User.findById(referringDoctorId);
                if (!specifiedDoctor || specifiedDoctor.role !== 'doctor' ||
                    specifiedDoctor.hospitalId?.toString() !== user.hospitalId.toString()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid referring doctor. Doctor must belong to your hospital.'
                    });
                }
                referringDoctor = specifiedDoctor._id;
            } else {
                // For hospital admins, try to find a default doctor from the hospital
                const defaultDoctor = await User.findOne({
                    role: 'doctor',
                    hospitalId: user.hospitalId,
                    approvalStatus: 'approved',
                    isActive: true
                }).sort({ createdAt: 1 }); // Get the first approved doctor

                if (defaultDoctor) {
                    referringDoctor = defaultDoctor._id;
                } else {
                    // If no doctor found, we can't create the referral
                    return res.status(400).json({
                        success: false,
                        message: 'No approved doctor found in your hospital. Please assign a doctor first or specify a referring doctor in the form.'
                    });
                }
            }
        }

        // Validate that we have both referring doctor and hospital
        if (!referringDoctor || !referringHospital) {
            return res.status(400).json({
                success: false,
                message: 'Referring doctor and hospital are required'
            });
        }

        // Generate referral ID (pre-save hook will also generate if not provided, but we'll set it explicitly)
        const referralId = Referral.generateReferralId();

        // Create referral
        const referralData = {
            referralId,
            patient: patientId,
            referringDoctor: referringDoctor,
            referringHospital: referringHospital,
            receivingHospital: receivingHospitalId,
            receivingDoctor: receivingDoctorId || null,
            reason,
            priority: priority || 'medium',
            specialty,
            chiefComplaint,
            historyOfPresentIllness: historyOfPresentIllness || '',
            physicalExamination: physicalExamination || '',
            vitalSigns: vitalSigns || {},
            diagnosis: diagnosis || '',
            treatmentPlan: treatmentPlan || '',
            notes: notes || '',
            status: 'pending'
        };

        const referral = new Referral(referralData);
        await referral.save();

        const createdReferral = await Referral.findById(referral._id)
            .populate('patient', 'firstName lastName email phone')
            .populate('referringDoctor', 'firstName lastName email specialization')
            .populate('referringHospital', 'name address')
            .populate('receivingDoctor', 'firstName lastName email specialization')
            .populate('receivingHospital', 'name address')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Referral created successfully',
            data: createdReferral
        });
    } catch (error) {
        console.error('Create referral error:', error);
        res.status(500).json({ success: false, message: 'Error creating referral', error: error.message });
    }
};

/**
 * Update referral
 */
const updateReferral = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const updateData = req.body;

        const referral = await Referral.findById(id);
        if (!referral) {
            return res.status(404).json({ success: false, message: 'Referral not found' });
        }

        // Check permissions
        if (user.role === 'hospital' && user.hospitalId) {
            if (referral.referringHospital?.toString() !== user.hospitalId.toString() &&
                referral.receivingHospital?.toString() !== user.hospitalId.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        // Update allowed fields
        const allowedFields = [
            'reason', 'priority', 'specialty', 'chiefComplaint',
            'historyOfPresentIllness', 'physicalExamination', 'vitalSigns',
            'diagnosis', 'treatmentPlan', 'notes', 'receivingDoctor'
        ];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                referral[field] = updateData[field];
            }
        });

        await referral.save();

        const updatedReferral = await Referral.findById(referral._id)
            .populate('patient', 'firstName lastName email phone')
            .populate('referringDoctor', 'firstName lastName email specialization')
            .populate('referringHospital', 'name address')
            .populate('receivingDoctor', 'firstName lastName email specialization')
            .populate('receivingHospital', 'name address')
            .lean();

        res.json({
            success: true,
            message: 'Referral updated successfully',
            data: updatedReferral
        });
    } catch (error) {
        console.error('Update referral error:', error);
        res.status(500).json({ success: false, message: 'Error updating referral', error: error.message });
    }
};

/**
 * Update referral status
 */
const updateReferralStatus = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const referral = await Referral.findById(id);
        if (!referral) {
            return res.status(404).json({ success: false, message: 'Referral not found' });
        }

        // Check permissions
        if (user.role === 'hospital' && user.hospitalId) {
            if (referral.receivingHospital?.toString() !== user.hospitalId.toString()) {
                return res.status(403).json({ success: false, message: 'Only receiving hospital can update status' });
            }
        }

        referral.status = status;
        if (notes) {
            referral.notes = notes;
        }

        // Add timeline entry
        referral.timeline.push({
            status,
            updatedBy: user._id,
            notes: notes || `Status changed to ${status}`,
            timestamp: new Date()
        });

        await referral.save();

        res.json({
            success: true,
            message: 'Referral status updated successfully',
            data: referral
        });
    } catch (error) {
        console.error('Update referral status error:', error);
        res.status(500).json({ success: false, message: 'Error updating referral status', error: error.message });
    }
};

module.exports = {
    getReferrals,
    getReferralById,
    createReferral,
    updateReferral,
    updateReferralStatus
};

