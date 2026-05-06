const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { sanitizeFileName } = require('../utils/validation');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES || 10 * 1024 * 1024);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.xlsx', '.pptx']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = sanitizeFileName(path.basename(file.originalname || 'upload', ext), 'upload')
      .slice(0, 80) || 'upload';
    cb(null, `${Date.now()}_${baseName}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return cb(new Error('Unsupported file type'));
  }

  return cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 10,
  },
});
