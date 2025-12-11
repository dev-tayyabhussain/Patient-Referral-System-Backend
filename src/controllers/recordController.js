const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const Hospital = require('../models/Hospital');

// @desc    Get all medical records for a patient
// @route   GET /api/records
// @access  Private (Patient, Doctor, Hospital)
const getRecords = async (req, res) => {
    try {
        const { patient, doctor, specialty, startDate, endDate, status, page = 1, limit = 10 } = req.query;
        const user = req.user;

        // Build filter based on user role
        let filter = {};

        if (user.role === 'patient') {
            // Patients can only see their own records
            filter.patient = user._id;
        } else if (user.role === 'doctor') {
            // Doctors can see records they created or for their hospital
            if (patient) {
                filter.patient = patient;
                filter.doctor = user._id;
            } else {
                filter.doctor = user._id;
            }
        } else if (user.role === 'hospital') {
            // Hospital admins can see all records for their hospital
            const hospital = await Hospital.findOne({ email: user.email });
            if (hospital) {
                filter.hospital = hospital._id;
                if (patient) filter.patient = patient;
            }
        } else if (user.role === 'super_admin') {
            // Super admins can see all records
            if (patient) filter.patient = patient;
        }

        // Apply additional filters
        if (doctor) filter.doctor = doctor;
        if (specialty) filter.specialty = specialty;
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.visitDate = {};
            if (startDate) filter.visitDate.$gte = new Date(startDate);
            if (endDate) filter.visitDate.$lte = new Date(endDate);
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await MedicalRecord.countDocuments(filter);

        const records = await MedicalRecord.find(filter)
            .populate('patient', 'firstName lastName email phone dateOfBirth gender profileImage')
            .populate('doctor', 'firstName lastName specialization email phone')
            .populate('hospital', 'name address phone email')
            .populate('referral', 'referralId status')
            .sort({ visitDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            success: true,
            data: {
                records,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get records error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get single medical record by ID
// @route   GET /api/records/:id
// @access  Private
const getRecordById = async (req, res) => {
    try {
        const record = await MedicalRecord.findById(req.params.id)
            .populate('patient', 'firstName lastName email phone dateOfBirth gender profileImage address emergencyContact emergencyPhone')
            .populate('doctor', 'firstName lastName specialization email phone licenseNumber')
            .populate('hospital', 'name address phone email')
            .populate('referral', 'referralId status priority specialty')
            .populate('attachments.uploadedBy', 'firstName lastName');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found'
            });
        }

        // Check authorization
        const user = req.user;
        const isAuthorized =
            user.role === 'super_admin' ||
            record.patient._id.toString() === user._id.toString() ||
            record.doctor._id.toString() === user._id.toString() ||
            (user.role === 'hospital' && record.hospital._id.toString() === user.hospitalId?.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this record'
            });
        }

        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('Get record by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Create new medical record
// @route   POST /api/records
// @access  Private (Doctor only)
const createRecord = async (req, res) => {
    try {
        // Only doctors can create records
        if (req.user.role !== 'doctor') {
            return res.status(403).json({
                success: false,
                message: 'Only doctors can create medical records'
            });
        }

        const recordData = {
            ...req.body,
            doctor: req.user._id,
            hospital: req.user.hospitalId
        };

        const record = await MedicalRecord.create(recordData);

        const populatedRecord = await MedicalRecord.findById(record._id)
            .populate('patient', 'firstName lastName email phone')
            .populate('doctor', 'firstName lastName specialization')
            .populate('hospital', 'name');

        res.status(201).json({
            success: true,
            data: populatedRecord,
            message: 'Medical record created successfully'
        });
    } catch (error) {
        console.error('Create record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update medical record
// @route   PUT /api/records/:id
// @access  Private (Doctor only)
const updateRecord = async (req, res) => {
    try {
        const record = await MedicalRecord.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found'
            });
        }

        // Only the doctor who created the record can update it
        if (record.doctor.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this record'
            });
        }

        // Don't allow changing patient, doctor, or hospital
        delete req.body.patient;
        delete req.body.doctor;
        delete req.body.hospital;

        const updatedRecord = await MedicalRecord.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('patient', 'firstName lastName email phone')
            .populate('doctor', 'firstName lastName specialization')
            .populate('hospital', 'name');

        res.status(200).json({
            success: true,
            data: updatedRecord,
            message: 'Medical record updated successfully'
        });
    } catch (error) {
        console.error('Update record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Upload files to medical record
// @route   POST /api/records/:id/files
// @access  Private (Doctor only)
const uploadRecordFiles = async (req, res) => {
    try {
        const record = await MedicalRecord.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found'
            });
        }

        // Only the doctor who created the record can upload files
        if (record.doctor.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to upload files to this record'
            });
        }

        // This would integrate with Cloudinary
        // For now, just add the file info from request body
        const { files } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({
                success: false,
                message: 'Files array is required'
            });
        }

        files.forEach(file => {
            record.attachments.push({
                ...file,
                uploadedBy: req.user._id,
                uploadedAt: new Date()
            });
        });

        await record.save();

        res.status(200).json({
            success: true,
            data: record.attachments,
            message: 'Files uploaded successfully'
        });
    } catch (error) {
        console.error('Upload files error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get files from medical record
// @route   GET /api/records/:id/files
// @access  Private
const getRecordFiles = async (req, res) => {
    try {
        const record = await MedicalRecord.findById(req.params.id)
            .select('attachments patient doctor hospital')
            .populate('attachments.uploadedBy', 'firstName lastName');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found'
            });
        }

        // Check authorization
        const user = req.user;
        const isAuthorized =
            user.role === 'super_admin' ||
            record.patient.toString() === user._id.toString() ||
            record.doctor.toString() === user._id.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access these files'
            });
        }

        res.status(200).json({
            success: true,
            data: record.attachments
        });
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getRecords,
    getRecordById,
    createRecord,
    updateRecord,
    uploadRecordFiles,
    getRecordFiles
};
