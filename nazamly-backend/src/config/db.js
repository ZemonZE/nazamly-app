const mongoose = require("mongoose");

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log("Using existing Mongo connection");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: "nazamly-app",
    });

    console.log("Mongo Connected");
  } catch (error) {
    console.error("Mongo connection error:", error);
    process.exit(1);
  }
};
module.exports = connectDB;