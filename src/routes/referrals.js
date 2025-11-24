const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getReferrals,
    getReferralById,
    createReferral,
    updateReferral,
    updateReferralStatus
} = require('../controllers/referralController');

// All routes require authentication
router.use(protect);

// Get all referrals with filtering and pagination
router.get('/', getReferrals);

// Get referral by ID
router.get('/:id', getReferralById);

// Create new referral
router.post('/', createReferral);

// Update referral
router.put('/:id', updateReferral);

// Update referral status
router.patch('/:id/status', updateReferralStatus);

module.exports = router;
