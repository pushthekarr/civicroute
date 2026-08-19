const express = require('express');
const multer = require('multer');
const path = require('path');
const { createComplaint, getComplaint, getStats } = require('../controllers/complaintController');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/', upload.single('image'), createComplaint);
router.get('/stats', getStats);       // must be before /:id
router.get('/:id', getComplaint);

module.exports = router;
