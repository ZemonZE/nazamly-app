const express = require("express");
const cors = require("cors");
require("dotenv").config();
const database = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const scheduleRoutes = require("./routes/Schedule.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/schedule", scheduleRoutes);

// بنبدأ السيرفر بعد ما الداتابيز تتوصل بنجاح
const startServer = async () => {
  try {
    await database.connect();
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
