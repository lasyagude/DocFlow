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

const isSafeFileNameChar = (char) => {
  const code = char.charCodeAt(0);
  return (code >= 48 && code <= 57)
    || (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || char === '.'
    || char === '-'
    || char === '_';
};

const sanitizeFileName = (value, fallback = 'file') => {
  const input = String(value || fallback);
  let output = '';
  let previousWasUnderscore = false;

  for (const char of input) {
    if (isSafeFileNameChar(char)) {
      output += char;
      previousWasUnderscore = char === '_';
    } else if (!previousWasUnderscore) {
      output += '_';
      previousWasUnderscore = true;
    }
  }

  return output || fallback;
};

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
  sanitizeFileName,
};
