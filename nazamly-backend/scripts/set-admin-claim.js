#!/usr/bin/env node
/**
 * Set Admin Custom Claim in Firebase
 * Sets the 'admin' custom claim on a Firebase user
 * Usage: node scripts/set-admin-claim.js <email-or-uid>
 */

require('dotenv').config();
const admin = require('../src/config/firebase');

async function setAdminClaim(identifier) {
  try {
    console.log('Setting admin claim...\n');
    
    // Get user by email or UID
    let user;
    if (identifier.includes('@')) {
      user = await admin.auth().getUserByEmail(identifier);
    } else {
      user = await admin.auth().getUser(identifier);
    }
    
    console.log('Found user:');
    console.log(`   Email: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Current claims: ${JSON.stringify(user.customClaims || {})}`);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log('\n✅ Admin claim set successfully!');
    console.log(`   ${user.email} is now an admin`);
    console.log(`   User must re-login to get new token\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node scripts/set-admin-claim.js <email-or-uid>');
  process.exit(1);
}

setAdminClaim(identifier);
