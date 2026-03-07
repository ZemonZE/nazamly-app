const express = require("express");
const cors = require("cors");

// 1. Route Imports
const authRoutes = require("./routes/auth.routes");
const gpaRoutes = require("./routes/gpa.routes");
const scheduleRoutes = require("./routes/schedule.routes");
const app = express();

// 2. Global Middlewares
app.use(cors());
app.use(express.json());

// 3. Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/gpa", gpaRoutes);
app.use("/api/schedule", scheduleRoutes);

module.exports = app;
