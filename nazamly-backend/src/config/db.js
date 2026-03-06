const mongoose = require("mongoose");

let connection = null;

const connectDB = async () => {
  if (connection) {
    console.log("DB already connected (Singleton)");
    return connection;
  }

  try {
    await mongoose.connect(process.env.MONGO_URL);
    connection = mongoose.connection;
    console.log("Mongo Connected");
    return connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

//const getConnection = () => {
//  if (!connection) {
//    throw new Error("Database not connected. Call connectDB() first.");
//  }
//  return connection;
//};

module.exports = connectDB;