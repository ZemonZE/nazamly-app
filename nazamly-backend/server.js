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
    const PORT = process.env.PORT || 5000;
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

      // ── START PYTHON OCR SERVICE AUTOMATICALLY ──
      const { spawn } = require('child_process');
      const path = require('path');
      const fs = require('fs');

      const isWindows = os.platform() === 'win32';
      // Target the virtual environment python if it exists
      const venvPythonPath = path.join(__dirname, 'ocr-service', 'venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python');
      const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python';

      console.log(`🤖 Starting OCR Service using: ${pythonExecutable === 'python' ? 'System Python' : 'Virtual Environment'}`);
      
      const pythonProcess = spawn(pythonExecutable, ['app.py'], {
        cwd: path.join(__dirname, 'ocr-service'),
        shell: false
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log(`[🐍 PYTHON OCR]: ${data.toString().trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`[🐍 PYTHON ERR]: ${data.toString().trim()}`);
      });

      pythonProcess.on('close', (code) => {
        console.log(`[🐍 PYTHON OCR]: Process exited with code ${code}`);
      });

      // Ensure child process is killed when Node exits
      const killPython = () => {
        if (pythonProcess && !pythonProcess.killed) {
          pythonProcess.kill();
        }
      };

      process.on('exit', killPython);
      process.on('SIGINT', () => { killPython(); process.exit(); });
      process.on('SIGTERM', () => { killPython(); process.exit(); });
      // Nodemon uses SIGUSR2 for restarts
      process.once('SIGUSR2', () => { killPython(); process.kill(process.pid, 'SIGUSR2'); });
    });
  })
  .catch((err) => {
    console.log(`Error in connection mongoose ${err}`);
    process.exit(1);
  });
