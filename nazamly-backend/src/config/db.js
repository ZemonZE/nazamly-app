const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo Connected");
};

module.exports = connectDB;

//اخو فاير بيز هو مونجو نفس الفكرة