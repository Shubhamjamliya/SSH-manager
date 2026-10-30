const express = require('express');
const { register, login, me, updateProfile, changePassword } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));
router.put('/me', requireAuth, asyncHandler(updateProfile));
router.put('/me/password', requireAuth, asyncHandler(changePassword));

module.exports = router;
