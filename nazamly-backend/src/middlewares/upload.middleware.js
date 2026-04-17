// src/middlewares/upload.middleware.js
const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');
const fs     = require('fs');

const UPLOAD_DIR     = process.env.UPLOAD_DIR || './uploads/transcripts';
const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
const ALLOWED_MIMES  = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream']);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const userId = req.user?.uid || 'unknown';
    const hash   = crypto.randomBytes(12).toString('hex');
    const ext    = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${userId}_${hash}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error('Only JPEG, PNG, WebP, and PDF files are allowed.'),
        { code: 'INVALID_FILE_TYPE' }
      ),
      false
    );
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE_BYTES } });

module.exports = upload;