const express = require('express');
const { listLogs } = require('../controllers/logController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(listLogs));

module.exports = router;
