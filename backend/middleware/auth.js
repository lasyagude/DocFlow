const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isValidObjectId } = require('../utils/validation');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization') || '';
    const normalizedHeader = authHeader.trim();
    const separatorIndex = normalizedHeader.indexOf(' ');
    const scheme = separatorIndex === -1 ? normalizedHeader : normalizedHeader.slice(0, separatorIndex);
    const token = scheme.toLowerCase() === 'bearer' && separatorIndex !== -1
      ? normalizedHeader.slice(separatorIndex + 1).trim()
      : '';
    if (!token) return res.status(401).json({ message: 'No token, access denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'docflow-api',
      audience: 'docflow-client',
    });
    if (!isValidObjectId(decoded.userId)) {
      return res.status(401).json({ message: 'Token is invalid' });
    }

    const user = await User.findById(decoded.userId).select('_id role isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Account is unavailable' });
    }

    req.userId = user._id.toString();
    req.user = { id: req.userId, role: user.role };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is invalid' });
  }
};

module.exports = auth;
