const express = require('express');
const { listSnippets, createSnippet, updateSnippet, deleteSnippet } = require('../controllers/snippetController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(listSnippets));
router.post('/', asyncHandler(createSnippet));
router.put('/:id', asyncHandler(updateSnippet));
router.delete('/:id', asyncHandler(deleteSnippet));

module.exports = router;
