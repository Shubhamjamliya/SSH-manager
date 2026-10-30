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

const router = express.Router();

router.use(requireAuth);
router.get('/', listServers);
router.post('/', createServer);
router.put('/:id', updateServer);
router.delete('/:id', deleteServer);
router.get('/:id/access', getServerAccess);
router.put('/:id/access', updateServerAccess);

module.exports = router;
