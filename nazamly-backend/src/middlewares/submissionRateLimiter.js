const { rateLimit } = require('express-rate-limit');

const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.uid || req.ip,
  message: { success: false, message: 'Too many submissions. Please wait before submitting again.' },
});

module.exports = submissionRateLimiter;
