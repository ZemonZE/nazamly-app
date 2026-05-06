const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// 1. Route Imports
const authRoutes = require("./routes/auth.routes");
const gpaRoutes = require("./routes/gpa.routes");
const scheduleRoutes = require('./routes/schedule.routes');
const aiRoutes = require('./routes/ai.routes');
const materialsRoutes = require('./routes/materials.routes');
const courseRoutes = require('./routes/course.routes');
const questionsRoutes = require('./routes/questions.routes');
const codingRoutes = require('./routes/coding.routes');
const adminCodingRoutes = require('./routes/admin-coding.routes');
const courseMaterialsRoutes = require('./routes/courseMaterials.routes');
const adminRoutes = require('./routes/admin.routes');
const studentRoutes = require('./routes/student.routes');
const studentRegistrationRoutes = require('./routes/studentRegistration.routes');

const app = express();

// ════════════════════════════════════════════════
//  2. Security Middlewares
// ════════════════════════════════════════════════
app.use(helmet());

// CORS Configuration — production uses CORS_ORIGIN env var, dev allows all
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : null; // null = allow all origins in development

app.use(cors({
  origin: function (origin, callback) {
    // Allow if: no origin (mobile/curl), or dev mode (no CORS_ORIGIN set), or matches whitelist
    if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: origin not allowed'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ════════════════════════════════════════════════
//  Input Sanitization (NoSQL Injection Protection)
// ════════════════════════════════════════════════
function sanitize(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitize(obj[key]);
    }
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
});

// 3. Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ════════════════════════════════════════════════
//  4. Health Check (no auth required)
// ════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════
//  5. Rate Limiting
// ════════════════════════════════════════════════
// Global Rate Limiting: 500 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// Stricter rate limit for auth routes: 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many authentication attempts, please try again later.' }
});

// Stricter rate limit for AI routes: 5 requests per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many AI requests, please try again later.' }
});

// ════════════════════════════════════════════════
//  6. Mount Routes
// ════════════════════════════════════════════════
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/gpa", gpaRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/questions', aiLimiter, questionsRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/admin/coding', adminCodingRoutes);
app.use('/api/course-materials', courseMaterialsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/students', studentRegistrationRoutes);

// ════════════════════════════════════════════════
//  7. Global Error Handler
// ════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error' 
  });
});

module.exports = app;
