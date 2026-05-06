const mongoose = require('mongoose');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeEmail = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const cleanDisplayName = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ').slice(0, 80);
};

module.exports = {
  cleanDisplayName,
  isNonEmptyString,
  isValidEmail,
  isValidObjectId,
  normalizeEmail,
};
