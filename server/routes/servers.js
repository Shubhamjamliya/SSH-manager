const express = require('express');
const {
  listServers,
  createServer,
  updateServer,
  deleteServer,
  getServerAccess,
  updateServerAccess,
} = require('../controllers/serverController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(listServers));
router.post('/', asyncHandler(createServer));
router.put('/:id', asyncHandler(updateServer));
router.delete('/:id', asyncHandler(deleteServer));
router.get('/:id/access', asyncHandler(getServerAccess));
router.put('/:id/access', asyncHandler(updateServerAccess));

module.exports = router;
