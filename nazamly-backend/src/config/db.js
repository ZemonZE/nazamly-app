const mongoose = require("mongoose");

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log("Using existing Mongo connection");
    return;
  }

  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/nazamly";
    await mongoose.connect(mongoUri);
    console.log("Mongo Connected");
  } catch (error) {
    console.error("Mongo connection error:", error);
    process.exit(1);
  }
};
module.exports = connectDB;