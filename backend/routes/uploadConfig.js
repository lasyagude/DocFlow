const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const sanitizedName = String(file.originalname || 'upload')
      .replace(/[^\w.-]+/g, '_');
    cb(null, `${Date.now()}_${sanitizedName}`);
  },
});

module.exports = multer({ storage });
