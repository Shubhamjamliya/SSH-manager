const Snippet = require('../models/Snippet');

async function listSnippets(req, res) {
  const snippets = await Snippet.find({
    $or: [{ owner: req.user._id }, { scope: 'team' }],
  }).sort({ createdAt: -1 });
  res.json({ snippets: snippets.map((s) => s.toSafeJSON()) });
}

async function createSnippet(req, res) {
  const { name, command, scope } = req.body;
  if (!name || !command) return res.status(400).json({ message: 'name and command are required' });

  const snippet = await Snippet.create({
    name,
    command,
    scope: scope === 'team' ? 'team' : 'private',
    owner: req.user._id,
  });
  res.status(201).json({ snippet: snippet.toSafeJSON() });
}

async function updateSnippet(req, res) {
  const snippet = await Snippet.findById(req.params.id);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
  if (String(snippet.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not allowed' });
  }

  const { name, command, scope } = req.body;
  if (name) snippet.name = name;
  if (command) snippet.command = command;
  if (scope) snippet.scope = scope === 'team' ? 'team' : 'private';

  await snippet.save();
  res.json({ snippet: snippet.toSafeJSON() });
}

async function deleteSnippet(req, res) {
  const snippet = await Snippet.findById(req.params.id);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
  if (String(snippet.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not allowed' });
  }
  await snippet.deleteOne();
  res.json({ message: 'Deleted' });
}

module.exports = { listSnippets, createSnippet, updateSnippet, deleteSnippet };
