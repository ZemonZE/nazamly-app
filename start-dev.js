const portfinder = require('portfinder');
const concurrently = require('concurrently');
const path = require('path');

async function start() {
  try {
    portfinder.basePort = 5000;
    const backendPort = await portfinder.getPortPromise();
    const backendUrl = `http://localhost:${backendPort}`;

    console.log(`\x1b[32m[Smart-Starter] Using Backend Port: ${backendPort}\x1b[0m`);
    console.log(`\x1b[33m[Smart-Starter] Starting Backend, Frontend, Admin, and Mobile apps...\x1b[0m`);

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
        { 
          command: `npx expo start`, 
          cwd: path.join(__dirname, 'nazamly-mobile', 'my-app'), 
          name: 'mobile', 
          env: { EXPO_API_URL: backendUrl, ...process.env },
          prefixColor: 'yellow'
        },
      ],
      {
        prefix: 'name',
        killOthersOn: ['failure'],
        restartTries: 1,
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
