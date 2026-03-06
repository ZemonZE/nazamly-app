// src/middlewares/upload.middleware.js
const multer = require('multer');

// Use memory storage to avoid saving files to the disk
// This is optimal since we only need to pass the buffer to the AI service
const storage = multer.memoryStorage();

// Filter for images and PDF files only
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5 MB
    fileFilter: fileFilter
});

module.exports = upload;