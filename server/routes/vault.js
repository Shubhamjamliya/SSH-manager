const express = require('express');
const { listVaultMembers, grantVaultAccess, revokeVaultAccess } = require('../controllers/vaultController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/members', listVaultMembers);
router.post('/members', grantVaultAccess);
router.delete('/members/:memberId', revokeVaultAccess);

module.exports = router;
