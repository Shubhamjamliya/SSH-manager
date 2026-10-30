const express = require('express');
const { listVaultMembers, grantVaultAccess, revokeVaultAccess } = require('../controllers/vaultController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);
router.get('/members', asyncHandler(listVaultMembers));
router.post('/members', asyncHandler(grantVaultAccess));
router.delete('/members/:memberId', asyncHandler(revokeVaultAccess));

module.exports = router;
