const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getRecords,
    getRecordById,
    createRecord,
    updateRecord,
    uploadRecordFiles,
    getRecordFiles
} = require('../controllers/recordController');

// All routes require authentication
router.use(protect);

// Get all records with filtering and pagination
router.get('/', getRecords);

// Get record by ID
router.get('/:id', getRecordById);

// Create new record (doctors only)
router.post('/', createRecord);

// Update record (doctors only)
router.put('/:id', updateRecord);

// Upload files to record
router.post('/:id/files', uploadRecordFiles);

// Get record files
router.get('/:id/files', getRecordFiles);

module.exports = router;

