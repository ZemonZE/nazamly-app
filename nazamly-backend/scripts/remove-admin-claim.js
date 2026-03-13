#!/usr/bin/env node
/**
 * Remove Admin Custom Claim from Firebase
 * Usage: node scripts/remove-admin-claim.js <email-or-uid>
 */

require('dotenv').config();
const admin = require('../src/config/firebase');

async function removeAdminClaim(identifier) {
  try {
    let user;
    if (identifier.includes('@')) {
      user = await admin.auth().getUserByEmail(identifier);
    } else {
      user = await admin.auth().getUser(identifier);
    }
    
    console.log('Found user:', user.email);
    
    await admin.auth().setCustomUserClaims(user.uid, { admin: false });
    
    console.log('✅ Admin claim removed');
    console.log('   User must re-login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node scripts/remove-admin-claim.js <email-or-uid>');
  process.exit(1);
}

removeAdminClaim(identifier);
