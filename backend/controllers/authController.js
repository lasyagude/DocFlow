const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const jwt = require('jsonwebtoken');
const {
  cleanDisplayName,
  isNonEmptyString,
  isValidEmail,
  normalizeEmail,
} = require('../utils/validation');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    issuer: 'docflow-api',
    audience: 'docflow-client',
  });
};

// Register
exports.register = async (req, res) => {
  try {
    const name = cleanDisplayName(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!name || !isValidEmail(email) || !isNonEmptyString(password) || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Name, valid email, and password of at least 8 characters are required.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ name, email, password, role: 'user' });
    await user.save();

    const token = generateToken(user._id, user.role);

    // Log activity
    await new ActivityLog({
      userId: user._id,
      action: 'USER_REGISTER',
      details: { email: user.email }
    }).save();

    res.status(201).json({
      success: true,
      token,
      data: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!isValidEmail(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id, user.role);

    // Log activity
    await new ActivityLog({
      userId: user._id,
      action: 'USER_LOGIN',
      details: { email: user.email }
    }).save();

    res.status(200).json({
      success: true,
      token,
      data: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
