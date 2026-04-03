const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// 1. Route Imports
const authRoutes = require("./routes/auth.routes");
const gpaRoutes = require("./routes/gpa.routes");
const scheduleRoutes = require('./routes/Schedule.routes');
const aiRoutes = require('./routes/ai.routes');
const materialsRoutes = require('./routes/materials.routes');
const courseRoutes = require('./routes/course.routes');
// ── OLD BRANCH ROUTES (commented out — these routes don't exist yet on main) ──
// const courseMaterialsRoutes = require('./routes/courseMaterials.routes');
// const adminRoutes = require('./routes/admin.routes');
// ── END OLD BRANCH ROUTES ─────────────────────────────────────────────────────

const app = express();

// 2. Security Middlewares
app.use(helmet());

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : [/^http:\/\/localhost(:\d+)?$/]; // Allows any localhost port

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// 3. Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// 4. Rate Limiting
// Global Rate Limiting: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

// 5. Mount Routes
app.use("/api/auth", authLimiter, authRoutes);
// ── OLD BRANCH: auth was mounted without rate limiter ───────────────────────
// app.use("/api/auth", authRoutes);
// ── END OLD BRANCH ──────────────────────────────────────────────────────────
app.use("/api/gpa", gpaRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/courses', courseRoutes);
// ── OLD BRANCH ROUTE MOUNTS (commented out — route files don't exist yet) ──
// app.use('/api/course-materials', courseMaterialsRoutes);
// app.use('/api/admin', adminRoutes);
// ── END OLD BRANCH ROUTE MOUNTS ─────────────────────────────────────────────

// 6. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error' 
  });
});

module.exports = app;
