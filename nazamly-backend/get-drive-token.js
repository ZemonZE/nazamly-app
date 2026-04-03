// get-drive-token.js — One-time script to get OAuth2 refresh token
// Run: node get-drive-token.js
// Then open the URL in your browser, sign in, and paste the code back here.

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.DRIVE_CLIENT_SECRET;
const REDIRECT_URI = process.env.DRIVE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive'],
});

console.log('\n🔗 Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n⏳ Waiting for you to sign in...\n');

// Start a temporary server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  const queryParams = Object.fromEntries(url.searchParams);
  
  if (queryParams.code) {
    try {
      const { tokens } = await oauth2Client.getToken(queryParams.code);
      
      console.log('✅ Authentication successful!\n');
      console.log(`📋 Obtained refresh token: ${tokens.refresh_token}`);
      
      // Automatically update .env file
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        const tokenRegex = /^DRIVE_REFRESH_TOKEN=.*$/m;
        
        if (tokenRegex.test(envContent)) {
          envContent = envContent.replace(tokenRegex, `DRIVE_REFRESH_TOKEN='${tokens.refresh_token}'`);
        } else {
          envContent += `\nDRIVE_REFRESH_TOKEN='${tokens.refresh_token}'\n`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log('📝 .env file updated automatically!\n');
      } else {
        console.log('⚠️ .env file not found. Please update it manually:\n');
        console.log(`DRIVE_REFRESH_TOKEN='${tokens.refresh_token}'`);
      }
      
      console.log('\n');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>✅ Success!</h1><p>You can close this tab and go back to the terminal.</p>');
    } catch (err) {
      console.error('❌ Error getting token:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>❌ Error</h1><p>Check the terminal for details.</p>');
    }
    
    server.close();
  }
});

server.listen(3000, () => {
  console.log('🌐 Local server listening on http://localhost:3000');
});
