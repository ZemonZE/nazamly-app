require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const os = require("os");

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const localIP = getLocalIP();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log("=".repeat(60));
      console.log("✅ Server running successfully!");
      console.log("=".repeat(60));
      console.log(`📍 Local:   http://localhost:${PORT}/api`);
      console.log(`📍 Network: http://${localIP}:${PORT}/api`);
      console.log("=".repeat(60));
      console.log("💡 Use the Network URL in your mobile app");
      console.log("=".repeat(60));
    });
  })
  .catch((err) => {
    console.log(`Error in connection mongoose ${err}`);
    process.exit(1);
  });
