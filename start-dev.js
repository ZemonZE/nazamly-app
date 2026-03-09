const portfinder = require('portfinder');
const concurrently = require('concurrently');
const path = require('path');

async function start() {
  try {
    // 1. Find a free port for the backend (starting from 5000)
    portfinder.basePort = 5000;
    const backendPort = await portfinder.getPortPromise();
    const backendUrl = `http://localhost:${backendPort}`;

    console.log(`\x1b[32m[Smart-Starter] Using Backend Port: ${backendPort}\x1b[0m`);

    // 2. Find free ports for frontend and admin (Vite will handle its own, but we can be explicit if we want)
    // However, the most important thing is that they know the Backend URL.

    const { result } = concurrently(
      [
        { 
          command: `npm run dev`, 
          cwd: path.join(__dirname, 'nazamly-backend'), 
          name: 'backend', 
          env: { PORT: backendPort, ...process.env },
          prefixColor: 'blue'
        },
        { 
          command: `npm run dev`, 
          cwd: path.join(__dirname, 'nazamly-front'), 
          name: 'frontend', 
          env: { VITE_API_URL: backendUrl, ...process.env },
          prefixColor: 'green'
        },
        { 
          command: `npm run dev`, 
          cwd: path.join(__dirname, 'nazamly-admin'), 
          name: 'admin', 
          env: { VITE_API_URL: backendUrl, ...process.env },
          prefixColor: 'magenta'
        },
      ],
      {
        prefix: 'name',
        killOthers: ['failure', 'success'],
        restartTries: 3,
      }
    );

    result.then(
      () => console.log('Successfully exited all processes'),
      (err) => console.error('One or more processes failed', err)
    );
  } catch (err) {
    console.error('Failed to start development environment:', err);
    process.exit(1);
  }
}

start();
