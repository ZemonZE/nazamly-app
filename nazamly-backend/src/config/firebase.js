// src/config/firebase.js
const admin = require('firebase-admin');

try {
    // Attempt to load the hidden Firebase key file
    const serviceAccount = require('../../firebase-adminsdk.json');
    
    // If the file exists, initialize Firebase normally (Production)
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('🔥 Firebase Admin Initialized successfully.');
    }
} catch (error) {
    // If the file is missing, catch the error gracefully without crashing
    console.log('⚠️ Firebase Service Account JSON is missing. Running in Mock Auth mode...');
}

module.exports = admin;