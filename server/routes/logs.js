const express = require('express');
const { listLogs } = require('../controllers/logController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listLogs);

module.exports = router;
