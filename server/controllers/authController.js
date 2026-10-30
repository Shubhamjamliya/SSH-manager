const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  // First registered user becomes admin; everyone after is a member added by an admin flow in future.
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'admin' : 'member';

  const user = await User.create({ name, email, password, role });
  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeJSON() });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await user.comparePassword(password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken(user);
  res.json({ token, user: user.toSafeJSON() });
}

async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

async function updateProfile(req, res) {
  const { name, email } = req.body;

  if (email) {
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
    if (existing) return res.status(409).json({ message: 'Email already in use' });
    req.user.email = email.toLowerCase();
  }
  if (name) req.user.name = name;

  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  const match = await req.user.comparePassword(currentPassword);
  if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

  req.user.password = newPassword;
  await req.user.save();
  res.json({ message: 'Password updated' });
}

module.exports = { register, login, me, updateProfile, changePassword };
