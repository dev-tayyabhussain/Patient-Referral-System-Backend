const express = require('express');
const router = express.Router();

const {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    toggleUserStatus,
    getUserStats
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/auth');
const { validateUserUpdate } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [all, super_admin, hospital, doctor, patient]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive, approved, pending, rejected]
 *         description: Filter by user status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get('/', protect, authorize('super_admin'), getUsers);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics (Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 */
router.get('/stats', protect, authorize('super_admin'), getUserStats);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', protect, authorize('super_admin'), getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/:id', protect, authorize('super_admin'), validateUserUpdate, updateUser);

/**
 * @swagger
 * /api/users/{id}/toggle-status:
 *   patch:
 *     summary: Toggle user active status (Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *       403:
 *         description: Cannot deactivate super admin
 *       404:
 *         description: User not found
 */
router.patch('/:id/toggle-status', protect, authorize('super_admin'), toggleUserStatus);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Cannot delete super admin
 *       404:
 *         description: User not found
 */
router.delete('/:id', protect, authorize('super_admin'), deleteUser);

module.exports = router;

