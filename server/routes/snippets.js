const express = require('express');
const { listSnippets, createSnippet, updateSnippet, deleteSnippet } = require('../controllers/snippetController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listSnippets);
router.post('/', createSnippet);
router.put('/:id', updateSnippet);
router.delete('/:id', deleteSnippet);

module.exports = router;
