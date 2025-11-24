const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Clinic = require('../models/Clinic');

// Get all users (super admin)
const getUsers = async (req, res) => {
    try {
        const { role, status, search, page = 1, limit = 10 } = req.query;

        const filter = {};

        // Filter by role
        if (role && role !== 'all') {
            filter.role = role;
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

        const users = await User.find(filter)
            .populate('hospitalId', 'name address')
            .populate('clinicId', 'name address')
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .populate('hospitalId', 'name address email phone')
            .populate('clinicId', 'name address')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow password updates through this endpoint
        delete updateData.password;

        // Don't allow role changes (should be done through approval process)
        if (updateData.role) {
            delete updateData.role;
        }

        const user = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('hospitalId', 'name address')
            .populate('clinicId', 'name address')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deleting super admin
        if (user.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete super admin user'
            });
        }

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

// Toggle user active status
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deactivating super admin
        if (user.role === 'super_admin' && user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Cannot deactivate super admin user'
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        const updatedUser = await User.findById(id)
            .populate('hospitalId', 'name address')
            .populate('clinicId', 'name address')
            .select('-password');

        res.json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedUser
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling user status',
            error: error.message
        });
    }
};

// Get user statistics
const getUserStats = async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers,
            pendingUsers,
            superAdmins,
            hospitals,
            doctors,
            patients
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true, approvalStatus: 'approved' }),
            User.countDocuments({ approvalStatus: 'pending' }),
            User.countDocuments({ role: 'super_admin' }),
            User.countDocuments({ role: 'hospital' }),
            User.countDocuments({ role: 'doctor' }),
            User.countDocuments({ role: 'patient' })
        ]);

        res.json({
            success: true,
            data: {
                total: totalUsers,
                active: activeUsers,
                pending: pendingUsers,
                byRole: {
                    super_admin: superAdmins,
                    hospital: hospitals,
                    doctor: doctors,
                    patient: patients
                }
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics',
            error: error.message
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    toggleUserStatus,
    getUserStats
};

