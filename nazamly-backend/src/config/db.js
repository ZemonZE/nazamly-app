const mongoose = require("mongoose");

let connection = null;
const connectDB = async () => {
try{  
  if (connection) {
    return connection;
  }

  connection = await mongoose.connect("mongodb://localhost:27017/nazamly");
  console.log("Mongo Connected");
  return connection;
} catch (error) {
  console.error("MongoDB connection error:", error);
}
};

const getConnection = () => {
  try{
  if (!connection) {
    throw new Error("Database has not been connected yet. Call connectDB() first.");
  }
  return connection;
} catch (error) {
  console.error("MongoDB connection error:", error);
}
};

module.exports = {
  connectDB,
  getConnection,
};

//اخو فاير بيز هو مونجو نفس الفكرة