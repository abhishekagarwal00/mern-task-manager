const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const authResponse = (user) => ({
  token: signToken(user._id),
  user: { id: user._id, name: user.name, email: user.email },
});

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password }); // pre-save hook hashes password
    res.status(201).json(authResponse(user));
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    // Same message for "no user" and "wrong password" -> doesn't reveal which emails exist
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json(authResponse(user));
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = (req, res) => {
  const { _id, name, email } = req.user;
  res.json({ user: { id: _id, name, email } });
};
