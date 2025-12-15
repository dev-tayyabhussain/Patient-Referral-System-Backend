const express = require('express');
const router = express.Router();
const {
    getDoctors,
    getDoctorById,
    createDoctor,
    getDoctorPatients,
    getDoctorReferrals,
    getDoctorAnalytics
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor management endpoints
 */

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive, pending, approved, rejected]
 *         description: Filter by approval status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, phone, specialization, or license number
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization
 *       - in: query
 *         name: hospitalId
 *         schema:
 *           type: string
 *         description: Filter by hospital ID (Super Admin only)
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
 *         description: Doctors retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, authorize('super_admin', 'hospital', 'doctor'), getDoctors);

/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     summary: Get doctor by ID
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Doctor not found
 */
router.get('/:id', protect, authorize('super_admin', 'hospital', 'doctor'), getDoctorById);

/**
 * @swagger
 * /api/doctors:
 *   post:
 *     summary: Create a new doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - practiceType
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               practiceType:
 *                 type: string
 *                 enum: [own_clinic, hospital]
 *               hospitalId:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               specialization:
 *                 type: string
 *               yearsOfExperience:
 *                 type: number
 *     responses:
 *       201:
 *         description: Doctor created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', protect, authorize('super_admin', 'hospital'), createDoctor);

// @route   GET /api/doctors/:id/patients
// @desc    Get doctor's patients
// @access  Private (Doctor, Hospital Admin)
router.get('/:id/patients', protect, authorize('doctor', 'hospital'), getDoctorPatients);

// @route   GET /api/doctors/:id/referrals
// @desc    Get doctor's referrals
// @access  Private (Doctor, Hospital Admin)
router.get('/:id/referrals', protect, authorize('doctor', 'hospital'), getDoctorReferrals);

// @route   GET /api/doctors/:id/analytics
// @desc    Get doctor's analytics
// @access  Private (Doctor, Hospital Admin)
router.get('/:id/analytics', protect, authorize('doctor', 'hospital'), getDoctorAnalytics);

module.exports = router;
