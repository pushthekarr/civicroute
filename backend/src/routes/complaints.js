const express = require('express');
const multer = require('multer');
const path = require('path');
const { analyseComplaintRequest, createComplaint, getComplaint, updateComplaintStatus, getStats, getPriorityQueues } = require('../controllers/complaintController');

const router = express.Router();

const imageFilter = (req, file, callback) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  }
  return callback(null, true);
};

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

router.post('/', upload.single('image'), createComplaint);
router.post('/analyse', multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('image'), analyseComplaintRequest);
router.get('/stats', getStats);       // must be before /:id
router.get('/queues', getPriorityQueues);
router.get('/:id', getComplaint);
router.patch('/:id/status', updateComplaintStatus);

module.exports = router;
