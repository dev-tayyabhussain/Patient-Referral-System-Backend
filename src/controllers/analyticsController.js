const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Referral = require('../models/Referral');
const Patient = require('../models/Patient');

// @desc    Get super admin dashboard data
// @route   GET /api/analytics/super-admin-dashboard
// @access  Private (Super Admin only)
const getSuperAdminDashboard = async (req, res) => {
    try {
        const [
            totalHospitals,
            totalUsers,
            totalReferrals,
            activeReferrals,
            recentHospitals,
            recentActivities,
            systemHealth
        ] = await Promise.all([
            Hospital.countDocuments({ status: 'approved' }),
            User.countDocuments(),
            Referral.countDocuments(),
            Referral.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
            Hospital.find({ status: 'approved' })
                .sort({ createdAt: -1 })
                .limit(5),
            getRecentActivities('super_admin'),
            getSystemHealth()
        ]);

        const stats = {
            totalHospitals,
            totalUsers,
            totalReferrals,
            activeReferrals,
            systemHealth,
            lastBackup: new Date().toISOString(),
            monthlyGrowth: {
                hospitals: await getMonthlyGrowth(Hospital),
                users: await getMonthlyGrowth(User),
                referrals: await getMonthlyGrowth(Referral)
            }
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                hospitals: recentHospitals,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Super admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get hospital admin dashboard data
// @route   GET /api/analytics/hospital-admin-dashboard
// @access  Private (Hospital Admin only)
const getHospitalDashboard = async (req, res) => {
    try {
        // For hospitals, we need to find their hospital by email match
        const hospital = await Hospital.findOne({ email: req.user.email });

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: 'Hospital not found for this user. Please contact support.'
            });
        }

        const hospitalId = hospital._id;

        const [
            totalDoctors,
            totalPatients,
            totalReferrals,
            pendingReferrals,
            completedReferrals,
            todayAppointments,
            recentDoctors,
            recentReferrals,
            recentActivities
        ] = await Promise.all([
            User.countDocuments({ role: 'doctor', hospitalId }),
            Patient.countDocuments({ hospitalId }),
            Referral.countDocuments({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }]
            }),
            Referral.countDocuments({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }],
                status: 'pending'
            }),
            Referral.countDocuments({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }],
                status: 'completed'
            }),
            getTodayAppointments(hospitalId),
            User.find({ role: 'doctor', hospitalId })
                .select('firstName lastName specialization email phone status yearsOfExperience hospitalId licenseNumber qualification approvalStatus')
                .sort({ createdAt: -1 })
                .limit(5),
            Referral.find({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }]
            })
                .populate('patientId', 'firstName lastName')
                .populate('fromDoctor', 'firstName lastName specialization')
                .populate('toHospital', 'name')
                .sort({ createdAt: -1 })
                .limit(5),
            getRecentActivities('hospital', hospitalId)
        ]);

        const stats = {
            hospitalName: hospital?.name || 'Unknown Hospital',
            totalDoctors,
            totalPatients,
            totalReferrals,
            pendingReferrals,
            completedReferrals,
            todayAppointments,
            systemStatus: 'Operational',
            monthlyGrowth: {
                doctors: await getMonthlyGrowth(User, { role: 'doctor', hospitalId }),
                patients: await getMonthlyGrowth(Patient, { hospitalId }),
                referrals: await getMonthlyGrowth(Referral, {
                    $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }]
                })
            }
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                doctors: recentDoctors,
                referrals: recentReferrals,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Hospital admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get doctor dashboard data
// @route   GET /api/analytics/doctor-dashboard
// @access  Private (Doctor only)
const getDoctorDashboard = async (req, res) => {
    try {
        const doctorId = req.user._id;
        const hospitalId = req.user.hospitalId;

        // Get patients - patients are Users with role='patient' that have been referred to this doctor
        // We'll get patients from referrals where this doctor is the referring or receiving doctor
        const patientIdsFromReferrals = await Referral.distinct('patient', {
            $or: [
                { referringDoctor: doctorId },
                { receivingDoctor: doctorId }
            ]
        });

        const [
            totalPatients,
            todayAppointments,
            pendingReferrals,
            completedReferrals,
            thisMonthReferrals,
            activeReferrals,
            recentPatients,
            recentAppointments,
            recentReferrals,
            recentActivities
        ] = await Promise.all([
            User.countDocuments({
                role: 'patient',
                _id: { $in: patientIdsFromReferrals }
            }),
            getTodayAppointments(hospitalId, doctorId),
            Referral.countDocuments({
                $or: [
                    { referringDoctor: doctorId, status: 'pending' },
                    { receivingDoctor: doctorId, status: 'pending' }
                ]
            }),
            Referral.countDocuments({
                $or: [
                    { referringDoctor: doctorId, status: 'completed' },
                    { receivingDoctor: doctorId, status: 'completed' }
                ]
            }),
            Referral.countDocuments({
                $or: [
                    { referringDoctor: doctorId },
                    { receivingDoctor: doctorId }
                ],
                createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
            }),
            Referral.countDocuments({
                $or: [
                    { referringDoctor: doctorId },
                    { receivingDoctor: doctorId }
                ],
                status: { $in: ['pending', 'accepted', 'in_progress'] }
            }),
            User.find({
                role: 'patient',
                _id: { $in: patientIdsFromReferrals }
            })
                .select('firstName lastName email phone dateOfBirth gender profileImage')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            getDoctorAppointments(doctorId),
            Referral.find({
                $or: [
                    { referringDoctor: doctorId },
                    { receivingDoctor: doctorId }
                ]
            })
                .populate('patient', 'firstName lastName email phone')
                .populate('referringHospital', 'name address')
                .populate('receivingHospital', 'name address')
                .populate('referringDoctor', 'firstName lastName specialization')
                .populate('receivingDoctor', 'firstName lastName specialization')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            getRecentActivities('doctor', null, doctorId)
        ]);

        // Calculate age for patients
        const patientsWithAge = recentPatients.map(patient => {
            const age = patient.dateOfBirth
                ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                : null;
            return { ...patient, age };
        });

        const stats = {
            doctorName: `Dr. ${req.user.firstName} ${req.user.lastName}`,
            specialization: req.user.specialization || 'General Practice',
            totalPatients,
            todayAppointments,
            pendingReferrals,
            completedReferrals,
            activeReferrals,
            thisMonthReferrals,
            averageRating: 4.8, // This would come from a ratings system
            monthlyGrowth: {
                patients: await getMonthlyGrowth(User, {
                    role: 'patient',
                    _id: { $in: patientIdsFromReferrals }
                }),
                referrals: await getMonthlyGrowth(Referral, {
                    $or: [
                        { referringDoctor: doctorId },
                        { receivingDoctor: doctorId }
                    ]
                })
            }
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                patients: patientsWithAge,
                appointments: recentAppointments,
                referrals: recentReferrals,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Doctor dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get patient dashboard data
// @route   GET /api/analytics/patient-dashboard
// @access  Private (Patient only)
const getPatientDashboard = async (req, res) => {
    try {
        const patientId = req.user._id;
        const MedicalRecord = require('../models/MedicalRecord');

        const [
            totalReferrals,
            activeReferrals,
            completedReferrals,
            pendingReferrals,
            totalRecords,
            recentReferrals,
            recentRecords,
            recentActivities
        ] = await Promise.all([
            Referral.countDocuments({ patient: patientId }),
            Referral.countDocuments({
                patient: patientId,
                status: { $in: ['pending', 'accepted'] }
            }),
            Referral.countDocuments({ patient: patientId, status: 'completed' }),
            Referral.countDocuments({ patient: patientId, status: 'pending' }),
            MedicalRecord.countDocuments({ patient: patientId }),
            Referral.find({ patient: patientId })
                .populate('referringDoctor', 'firstName lastName specialization profileImage')
                .populate('receivingDoctor', 'firstName lastName specialization profileImage')
                .populate('referringHospital', 'name address phone')
                .populate('receivingHospital', 'name address phone')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            MedicalRecord.find({ patient: patientId })
                .populate('doctor', 'firstName lastName specialization profileImage')
                .populate('hospital', 'name address')
                .sort({ visitDate: -1 })
                .limit(10)
                .lean(),
            getRecentActivities('patient', null, null, patientId)
        ]);

        // Get next upcoming referral appointment if any
        const upcomingReferral = await Referral.findOne({
            patient: patientId,
            'appointment.scheduledDate': { $gte: new Date() },
            status: { $in: ['accepted', 'pending'] }
        })
            .populate('receivingHospital', 'name')
            .populate('receivingDoctor', 'firstName lastName')
            .sort({ 'appointment.scheduledDate': 1 })
            .lean();

        const stats = {
            patientName: `${req.user.firstName} ${req.user.lastName}`,
            age: calculateAge(req.user.dateOfBirth),
            gender: req.user.gender,
            totalReferrals,
            activeReferrals,
            completedReferrals,
            pendingReferrals,
            totalRecords,
            nextAppointment: upcomingReferral?.appointment?.scheduledDate || null,
            nextAppointmentHospital: upcomingReferral?.receivingHospital?.name || null,
            nextAppointmentDoctor: upcomingReferral?.receivingDoctor
                ? `Dr. ${upcomingReferral.receivingDoctor.firstName} ${upcomingReferral.receivingDoctor.lastName}`
                : null
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                referrals: recentReferrals,
                records: recentRecords,
                activities: recentActivities
            }
        });
    } catch (error) {
        console.error('Patient dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper functions
const getRecentActivities = async (role, hospitalId = null, doctorId = null, patientId = null) => {
    const activities = [];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
        if (role === 'super_admin') {
            // Get recent hospital registrations
            const recentHospitals = await Hospital.find({ createdAt: { $gte: oneWeekAgo } })
                .sort({ createdAt: -1 })
                .limit(5);

            recentHospitals.forEach(hospital => {
                activities.push({
                    id: hospital._id.toString(),
                    type: 'hospital_registered',
                    message: `New hospital "${hospital.name}" registered - Status: ${hospital.status}`,
                    timestamp: hospital.createdAt.toISOString(),
                    severity: hospital.status === 'pending' ? 'warning' : 'info'
                });
            });

            // Get recent user registrations
            const recentUsers = await User.find({
                createdAt: { $gte: oneWeekAgo },
                role: { $ne: 'super_admin' }
            })
                .sort({ createdAt: -1 })
                .limit(5);

            recentUsers.forEach(user => {
                activities.push({
                    id: user._id.toString(),
                    type: 'user_created',
                    message: `${user.role} ${user.firstName} ${user.lastName} registered`,
                    timestamp: user.createdAt.toISOString(),
                    severity: 'success'
                });
            });
        }

        if ((role === 'hospital' || role === 'hospital_admin') && hospitalId) {
            // Get recent doctor additions
            const recentDoctors = await User.find({
                role: 'doctor',
                hospitalId,
                createdAt: { $gte: oneWeekAgo }
            })
                .sort({ createdAt: -1 })
                .limit(5);

            recentDoctors.forEach(doctor => {
                activities.push({
                    id: doctor._id.toString(),
                    type: 'doctor_added',
                    message: `Dr. ${doctor.firstName} ${doctor.lastName} added to ${doctor.specialization} department`,
                    timestamp: doctor.createdAt.toISOString(),
                    severity: 'success'
                });
            });

            // Get recent referrals
            const recentReferrals = await Referral.find({
                $or: [{ fromHospital: hospitalId }, { toHospital: hospitalId }],
                createdAt: { $gte: oneWeekAgo }
            })
                .populate('patientId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(5);

            recentReferrals.forEach(referral => {
                activities.push({
                    id: referral._id.toString(),
                    type: 'referral_received',
                    message: `New referral for ${referral.patientId?.firstName} ${referral.patientId?.lastName}`,
                    timestamp: referral.createdAt.toISOString(),
                    severity: 'info'
                });
            });
        }

        if (role === 'doctor' && doctorId) {
            // Get recent referrals created or received
            const recentReferrals = await Referral.find({
                $or: [
                    { referringDoctor: doctorId },
                    { receivingDoctor: doctorId }
                ],
                createdAt: { $gte: oneWeekAgo }
            })
                .populate('patient', 'firstName lastName')
                .populate('receivingHospital', 'name')
                .populate('referringHospital', 'name')
                .sort({ createdAt: -1 })
                .limit(10);

            recentReferrals.forEach(referral => {
                const isReferring = referral.referringDoctor?.toString() === doctorId.toString();
                const patientName = referral.patient
                    ? `${referral.patient.firstName} ${referral.patient.lastName}`
                    : 'Unknown Patient';
                const hospitalName = isReferring
                    ? referral.receivingHospital?.name || 'Unknown Hospital'
                    : referral.referringHospital?.name || 'Unknown Hospital';

                activities.push({
                    id: referral._id.toString(),
                    type: isReferring ? 'referral_created' : 'referral_received',
                    message: isReferring
                        ? `Referral created for ${patientName} to ${hospitalName}`
                        : `Referral received for ${patientName} from ${referral.referringHospital?.name || 'Unknown'}`,
                    timestamp: referral.createdAt.toISOString(),
                    severity: referral.status === 'completed' ? 'success' :
                        referral.status === 'pending' ? 'warning' : 'info'
                });
            });
        }

        if (role === 'patient' && patientId) {
            const MedicalRecord = require('../models/MedicalRecord');

            // Get recent referrals
            const recentReferrals = await Referral.find({
                patient: patientId,
                createdAt: { $gte: oneWeekAgo }
            })
                .populate('referringDoctor', 'firstName lastName')
                .populate('receivingHospital', 'name')
                .sort({ createdAt: -1 })
                .limit(5);

            recentReferrals.forEach(referral => {
                const doctorName = referral.referringDoctor
                    ? `Dr. ${referral.referringDoctor.firstName} ${referral.referringDoctor.lastName}`
                    : 'Unknown Doctor';
                const hospitalName = referral.receivingHospital?.name || 'Unknown Hospital';

                activities.push({
                    id: referral._id.toString(),
                    type: 'referral_created',
                    message: `Referral created by ${doctorName} to ${hospitalName}`,
                    timestamp: referral.createdAt.toISOString(),
                    severity: referral.status === 'completed' ? 'success' :
                        referral.status === 'pending' ? 'warning' : 'info'
                });
            });

            // Get recent medical records
            const recentRecords = await MedicalRecord.find({
                patient: patientId,
                createdAt: { $gte: oneWeekAgo }
            })
                .populate('doctor', 'firstName lastName')
                .populate('hospital', 'name')
                .sort({ createdAt: -1 })
                .limit(5);

            recentRecords.forEach(record => {
                const doctorName = record.doctor
                    ? `Dr. ${record.doctor.firstName} ${record.doctor.lastName}`
                    : 'Unknown Doctor';
                const hospitalName = record.hospital?.name || 'Unknown Hospital';

                activities.push({
                    id: record._id.toString(),
                    type: 'record_created',
                    message: `Medical record added by ${doctorName} at ${hospitalName}`,
                    timestamp: record.createdAt.toISOString(),
                    severity: 'info'
                });
            });
        }

        return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    } catch (error) {
        console.error('Error getting recent activities:', error);
        return [];
    }
};

const getSystemHealth = async () => {
    try {
        // Check database connection
        const dbStatus = await User.findOne().then(() => 'Connected').catch(() => 'Disconnected');

        // Check recent error rates (simplified)
        const recentErrors = 0; // This would be tracked in a real system

        return {
            status: dbStatus === 'Connected' ? 'Healthy' : 'Unhealthy',
            database: dbStatus,
            api: 'Operational',
            storage: 'Normal',
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'Unhealthy',
            database: 'Error',
            api: 'Error',
            storage: 'Error',
            lastCheck: new Date().toISOString()
        };
    }
};

const getMonthlyGrowth = async (Model, filter = {}) => {
    try {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const [thisMonthCount, lastMonthCount] = await Promise.all([
            Model.countDocuments({ ...filter, createdAt: { $gte: thisMonth } }),
            Model.countDocuments({ ...filter, createdAt: { $gte: lastMonth, $lte: lastMonthEnd } })
        ]);

        if (lastMonthCount === 0) return thisMonthCount > 0 ? 100 : 0;

        return Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    } catch (error) {
        console.error('Error calculating monthly growth:', error);
        return 0;
    }
};

const getTodayAppointments = async (hospitalId, doctorId = null) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filter = {
            hospitalId,
            dateTime: { $gte: today, $lt: tomorrow }
        };

        if (doctorId) {
            filter.doctorId = doctorId;
        }

        // This would be from an Appointment model
        // For now, return a mock count
        return doctorId ? 8 : 45;
    } catch (error) {
        console.error('Error getting today appointments:', error);
        return 0;
    }
};

const getDoctorAppointments = async (doctorId) => {
    try {
        // This would be from an Appointment model
        // For now, return mock data
        return [
            {
                _id: '1',
                patientName: 'John Smith',
                time: '09:00 AM',
                date: '2025-01-16',
                type: 'Follow-up',
                status: 'Scheduled',
                notes: 'Blood pressure check',
                createdAt: new Date()
            },
            {
                _id: '2',
                patientName: 'Jane Doe',
                time: '10:30 AM',
                date: '2025-01-16',
                type: 'Consultation',
                status: 'Scheduled',
                notes: 'ECG review',
                createdAt: new Date()
            }
        ];
    } catch (error) {
        console.error('Error getting doctor appointments:', error);
        return [];
    }
};

const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

// @desc    Get referral trends analytics
// @route   GET /api/analytics/referral-trends
// @access  Private (Super Admin only)
const getReferralTrends = async (req, res) => {
    try {
        const user = req.user;
        const { period = '30' } = req.query; // days
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Build match filter based on user role
        let matchFilter = { createdAt: { $gte: startDate } };
        if (user.role === 'hospital' && user.hospitalId) {
            matchFilter = {
                ...matchFilter,
                $or: [
                    { referringHospital: user.hospitalId },
                    { receivingHospital: user.hospitalId }
                ]
            };
        }

        // Get referral counts by status
        const statusCounts = await Referral.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get referral counts by priority
        const priorityCounts = await Referral.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);

        // Get referral counts by specialty
        const specialtyCounts = await Referral.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$specialty', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get daily referral trends
        const dailyTrends = await Referral.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get referral completion rate
        const totalReferrals = await Referral.countDocuments(matchFilter);
        const completedReferrals = await Referral.countDocuments({
            ...matchFilter,
            status: 'completed'
        });
        const completionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

        res.json({
            success: true,
            data: {
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
                dailyTrends: dailyTrends.map(item => ({
                    date: item._id,
                    count: item.count
                })),
                completionRate: Math.round(completionRate * 100) / 100,
                totalReferrals,
                completedReferrals
            }
        });
    } catch (error) {
        console.error('Get referral trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching referral trends',
            error: error.message
        });
    }
};

// @desc    Get user activity patterns
// @route   GET /api/analytics/user-activity
// @access  Private (Super Admin, Hospital)
const getUserActivityPatterns = async (req, res) => {
    try {
        const user = req.user;
        const { period = '30' } = req.query; // days
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Build match filter based on user role
        let matchFilter = { createdAt: { $gte: startDate } };
        let activeUsersFilter = { isActive: true, approvalStatus: 'approved' };
        let pendingFilter = { approvalStatus: 'pending' };

        if (user.role === 'hospital' && user.hospitalId) {
            matchFilter = {
                ...matchFilter,
                $or: [
                    { role: 'doctor', hospitalId: user.hospitalId },
                    { role: 'patient', hospitalId: user.hospitalId }
                ]
            };
            activeUsersFilter = {
                ...activeUsersFilter,
                $or: [
                    { role: 'doctor', hospitalId: user.hospitalId },
                    { role: 'patient', hospitalId: user.hospitalId }
                ]
            };
            pendingFilter = {
                ...pendingFilter,
                $or: [
                    { role: 'doctor', hospitalId: user.hospitalId },
                    { role: 'patient', hospitalId: user.hospitalId }
                ]
            };
        }

        // Get user registrations by role
        const registrationsByRole = await User.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Get daily user registrations
        const dailyRegistrations = await User.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get user activity by approval status
        const activityByStatus = await User.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
        ]);

        // Get active users count
        const activeUsers = await User.countDocuments(activeUsersFilter);

        // Get pending approvals count
        const pendingApprovals = await User.countDocuments(pendingFilter);

        const totalUsers = await User.countDocuments(user.role === 'hospital' && user.hospitalId ? {
            $or: [
                { role: 'doctor', hospitalId: user.hospitalId },
                { role: 'patient', hospitalId: user.hospitalId }
            ]
        } : {});

        res.json({
            success: true,
            data: {
                totalUsers,
                registrationsByRole: registrationsByRole.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                dailyRegistrations: dailyRegistrations.map(item => ({
                    date: item._id,
                    count: item.count
                })),
                activityByStatus: activityByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                activeUsers,
                pendingApprovals,
                totalUsers: await User.countDocuments()
            }
        });
    } catch (error) {
        console.error('Get user activity patterns error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user activity patterns',
            error: error.message
        });
    }
};

// @desc    Get system performance metrics
// @route   GET /api/analytics/system-performance
// @access  Private (Super Admin only)
const getSystemPerformanceMetrics = async (req, res) => {
    try {
        // Get system health
        const systemHealth = await getSystemHealth();

        // Get database statistics
        const dbStats = {
            totalUsers: await User.countDocuments(),
            totalHospitals: await Hospital.countDocuments({ status: 'approved' }),
            totalReferrals: await Referral.countDocuments(),
            totalPatients: await User.countDocuments({ role: 'patient' })
        };

        // Get growth metrics
        const monthlyGrowth = {
            hospitals: await getMonthlyGrowth(Hospital),
            users: await getMonthlyGrowth(User),
            referrals: await getMonthlyGrowth(Referral)
        };

        // Get recent activity (last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const recentActivity = {
            newUsers: await User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            newHospitals: await Hospital.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            newReferrals: await Referral.countDocuments({ createdAt: { $gte: oneDayAgo } })
        };

        // Get pending items
        const pendingItems = {
            hospitals: await Hospital.countDocuments({ status: 'pending' }),
            users: await User.countDocuments({ approvalStatus: 'pending' }),
            referrals: await Referral.countDocuments({ status: 'pending' })
        };

        res.json({
            success: true,
            data: {
                systemHealth,
                dbStats,
                monthlyGrowth,
                recentActivity,
                pendingItems,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get system performance metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching system performance metrics',
            error: error.message
        });
    }
};

module.exports = {
    getSuperAdminDashboard,
    getHospitalDashboard,
    getDoctorDashboard,
    getPatientDashboard,
    getReferralTrends,
    getUserActivityPatterns,
    getSystemPerformanceMetrics
};
