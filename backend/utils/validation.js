const mongoose = require('mongoose');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeEmail = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
};

const isValidEmail = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const email = value.trim();
  const atIndex = email.indexOf('@');
  const lastAtIndex = email.lastIndexOf('@');
  const dotIndex = email.lastIndexOf('.');

  return atIndex > 0
    && atIndex === lastAtIndex
    && dotIndex > atIndex + 1
    && dotIndex < email.length - 1
    && !email.includes(' ');
};

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

  let output = '';
  let previousWasSpace = true;

  for (const char of value.trim()) {
    const isSpace = char === ' ' || char === '\t' || char === '\n' || char === '\r';
    if (isSpace) {
      if (!previousWasSpace) {
        output += ' ';
        previousWasSpace = true;
      }
    } else {
      output += char;
      previousWasSpace = false;
    }
  }

  return output.slice(0, 80);
};

module.exports = {
  cleanDisplayName,
  isNonEmptyString,
  isValidEmail,
  isValidObjectId,
  normalizeEmail,
  sanitizeFileName,
};
