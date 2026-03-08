require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

connectDB()
  .then(() => {
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((err) => {
    console.log(`Error in connection mongoose ${err}`);
    process.exit(1);
  });
