// test-drive.js — Quick test for Google Drive integration
// Run: node test-drive.js
require('dotenv').config();
const driveService = require('./src/services/drive.service');
const fs = require('fs');
const path = require('path');

async function testDrive() {
  console.log('🧪 Testing Google Drive Integration...\n');
  console.log('Root Folder ID:', process.env.DRIVE_ROOT_FOLDER_ID);

  // ── Test 1: Create a folder ──
  console.log('\n📁 Test 1: Creating a test folder...');
  const folder = await driveService.createFolder('Test Folder - Nazamly');
  console.log('✅ Folder created!');
  console.log('   ID:', folder.id);
  console.log('   Link:', folder.webViewLink);

  // ── Test 2: Upload a test file into that folder ──
  console.log('\n📄 Test 2: Uploading a test file...');
  const testContent = Buffer.from('Hello from Nazamly! This is a test file uploaded via Google Drive API.');
  const file = await driveService.uploadFile(
    testContent,
    'test-file.txt',
    'text/plain',
    folder.id
  );
  console.log('✅ File uploaded!');
  console.log('   ID:', file.id);
  console.log('   Link:', file.webViewLink);

  // ── Test 3: List files in the folder ──
  console.log('\n📋 Test 3: Listing files in the folder...');
  const files = await driveService.listFiles(folder.id);
  console.log('✅ Files found:', files.length);
  files.forEach(f => console.log(`   - ${f.name} (${f.mimeType})`));

  console.log('\n🎉 Done! Check your Google Drive to see the folder and file.');
  console.log('📁 Folder link:', folder.webViewLink);
  console.log('📄 File link:', file.webViewLink);
}

testDrive().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  console.error(err);
  process.exit(1);
});
