// src/config/drive.js
const { google } = require('googleapis');

let drive = null;

try {
  const oauth2Client = new google.auth.OAuth2(
    process.env.DRIVE_CLIENT_ID,
    process.env.DRIVE_CLIENT_SECRET,
    process.env.DRIVE_REDIRECT_URI
  );

  // Set the refresh token — obtained once via get-drive-token.js
  oauth2Client.setCredentials({
    refresh_token: process.env.DRIVE_REFRESH_TOKEN,
  });

  drive = google.drive({ version: 'v3', auth: oauth2Client });

  if (process.env.DRIVE_REFRESH_TOKEN) {
    console.log('📁 Google Drive API Initialized successfully (OAuth2).');
  } else {
    console.log('⚠️ DRIVE_REFRESH_TOKEN is missing. Run: node get-drive-token.js');
    drive = null;
  }
} catch (error) {
  console.log('⚠️ Google Drive config error:', error.message);
}

module.exports = drive;
