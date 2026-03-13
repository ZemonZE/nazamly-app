#!/usr/bin/env node
/**
 * List Firebase Users with Custom Claims
 */

require('dotenv').config();
const admin = require('../src/config/firebase');

async function listFirebaseUsers() {
  try {
    console.log('Fetching Firebase users...\n');
    
    const listUsersResult = await admin.auth().listUsers(1000);
    
    console.log(`Found ${listUsersResult.users.length} users:\n`);
    console.log('─'.repeat(100));
    
    listUsersResult.users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email || 'N/A'}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Custom Claims: ${JSON.stringify(user.customClaims || {})}`);
      console.log(`   Admin: ${user.customClaims?.admin ? '✅ Yes' : '❌ No'}`);
      console.log('─'.repeat(100));
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listFirebaseUsers();
