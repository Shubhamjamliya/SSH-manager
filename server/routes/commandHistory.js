const express = require('express');
const { listCommandHistory } = require('../controllers/commandHistoryController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(listCommandHistory));

module.exports = router;
