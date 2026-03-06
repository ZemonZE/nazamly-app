const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const scheduleRoutes = require("./routes/Schedule.routes");

const app = express();

app.use(cors());
app.use(express.json());
//
//app.use("/api", (req,res) => {
//  try{
//  res.status(200).json({ message: "API is running" });
//  }
//  catch(error){
//    res.status(500).json({ message: "API is not running" });
//  }
//});
app.use("/api/auth", authRoutes);
app.use("/api/schedule", scheduleRoutes);

module.exports = app;
