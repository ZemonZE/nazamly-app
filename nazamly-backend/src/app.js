const express = require("express");
const cors = require("cors");
const path = require("path");

// 1. Route Imports
const authRoutes = require("./routes/auth.routes");
const gpaRoutes = require("./routes/gpa.routes");
const scheduleRoutes = require('./routes/Schedule.routes');
const aiRoutes = require('./routes/ai.routes');
const materialsRoutes = require('./routes/materials.routes');
const courseRoutes = require('./routes/course.routes');

const app = express();

// 2. Global Middlewares
app.use(cors());
app.use(express.json());

// 3. Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// 4. Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/gpa", gpaRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/courses', courseRoutes);

module.exports = app;
