const mongoose = require("mongoose");

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log("Using existing Mongo connection");
    return;
  }

  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/nazamly";
    console.log("Connecting to MongoDB:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("✅ Mongo Connected successfully");
  } catch (error) {
    console.error("Mongo connection error:", error);
    process.exit(1);
  }
};
module.exports = connectDB;