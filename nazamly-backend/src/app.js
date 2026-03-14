const express = require("express");
const cors = require("cors");

// 1. Route Imports
const authRoutes = require("./routes/auth.routes");
const gpaRoutes = require("./routes/gpa.routes");
const scheduleRoutes = require('./routes/Schedule.routes');
 
// Add this in src/app.js alongside your other routes
const aiRoutes = require('./routes/ai.routes');
const materialsRoutes = require('./routes/materials.routes');

const app = express();

// 2. Global Middlewares
app.use(cors());
app.use(express.json());

// 3. Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/gpa", gpaRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/materials', materialsRoutes);

module.exports = app;
