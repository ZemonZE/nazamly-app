const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const requireAdmin = require('../middlewares/admin.middleware');
const { createProblem, updateProblem, deleteProblem, listProblemsAdmin } = require('../controllers/CodingProblem.controller');
const { getAdminSubmissions } = require('../controllers/CodeSubmission.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,   // 100 MB per file
    fieldSize: 100 * 1024 * 1024,  // 100 MB per field
    parts: 20,
  },
  // Increase busboy's internal stream buffer to handle large files
  highWaterMark: 100 * 1024 * 1024,
  fileHwm: 100 * 1024 * 1024,
});

router.use(authMiddleware, requireAdmin);

router.get('/problems', listProblemsAdmin);
router.post('/problems', upload.fields([{ name: 'descriptionFile', maxCount: 1 }, { name: 'testCasesFile', maxCount: 1 }]), createProblem);
router.put('/problems/:id', upload.fields([{ name: 'descriptionFile', maxCount: 1 }, { name: 'testCasesFile', maxCount: 1 }]), updateProblem);
router.delete('/problems/:id', deleteProblem);
router.get('/problems/:id/submissions', getAdminSubmissions);

module.exports = router;
