const express = require("express");
const cors = require("cors");

// 1. Route Imports
const authRoutes = require("./routes/auth.routes");
const gpaRoutes = require("./routes/gpa.routes"); // Import the new GPA routes

// Add this where your other routes are required
const scheduleRoutes = require('./routes/schedule.routes');
 
// Add this in src/app.js alongside your other routes
const aiRoutes = require('./routes/ai.routes');
const app = express();

// 2. Global Middlewares
app.use(cors());
app.use(express.json());

// 3. Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/gpa", gpaRoutes); // Mount the GPA routes

// Add this where your app.use() declarations are
app.use('/api/schedule', scheduleRoutes);
app.use('/api/ai', aiRoutes);

module.exports = app;