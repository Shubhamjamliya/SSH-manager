const express = require('express');
const { listCommandHistory } = require('../controllers/commandHistoryController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listCommandHistory);

module.exports = router;
