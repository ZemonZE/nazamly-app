const multer = require('multer');

const MAX_SIZE_BYTES =
  parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10) * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error('Only JPEG, PNG, and WebP images are allowed.'),
        { code: 'INVALID_FILE_TYPE' }
      ),
      false
    );
  }
};

const imageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

module.exports = imageUpload;
