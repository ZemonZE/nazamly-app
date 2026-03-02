require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

connectDB().catch((error) => {
  console.error("Failed to connect to the database:", error);
  process.exit(1); // Exit with failure code
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});