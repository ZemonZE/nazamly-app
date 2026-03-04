const mongoose = require("mongoose");

/**
 * Database Singleton Class
 * بيتأكد إن فيه connection واحدة بس مع الداتابيز
 * لو اتعمل connect قبل كده، بيرجع نفس الـ connection
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * @desc    Connect to MongoDB (Singleton)
   * لو مفيش connection، بيعمل واحدة جديدة
   * لو فيه connection موجودة، بيرجعها من غير ما يعمل واحدة تانية
   * @returns {Promise<mongoose.Connection>} الـ connection object
   */
  async connect() {
    if (this.connection) {
      console.log("DB already connected (Singleton)");
      return this.connection;
    }

    try {
      await mongoose.connect(process.env.MONGO_URL);
      this.connection = mongoose.connection;
      console.log("Mongo Connected");
      return this.connection;
    } catch (error) {
      console.error("MongoDB connection error:", error);
      process.exit(1);
    }
  }

  /**
   * @desc    Get the current DB connection
   * لو مفيش connection، بيرمي Error
   * @returns {mongoose.Connection} الـ connection الحالية
   * @throws {Error} لو مفيش connection موجودة
   */
  getConnection() {
    if (!this.connection) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.connection;
  }
}

// Singleton: بنعمل instance واحدة بس ونعملها export
const database = new Database();
module.exports = database;
