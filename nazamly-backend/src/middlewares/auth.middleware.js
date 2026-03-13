// src/middlewares/auth.middleware.js
const admin = require("../config/firebase");
// TODO: [SECURITY] Ensure TESTING MODE is commented out 
// and PRODUCTION MODE (Firebase Auth) is active before final deployment.
const authMiddleware = async (req, res, next) => {
    // ========================================================================
    // 🧪 TESTING MODE: Uncomment the block below to test via Postman easily
    // IMPORTANT: Remember to comment this out before pushing to GitHub!
    // ========================================================================
    
    // req.user = { 
    //     uid: 'Abdo123', // This MUST match the firebaseUid in your Atlas DB
    //     email: 'abdo@cu.edu.eg' 
    // };
    // console.log('🔓 Mock Auth Middleware: User authenticated successfully!');
    // return next();
    
    // ========================================================================

    // 🛡️ PRODUCTION MODE: Leader's Firebase Authentication
    try {
        const token = req.headers.authorization?.split("Bearer ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        let decodedToken;
        
        if (admin.apps.length > 0) {
            // Verify token if Firebase Admin is initialized
            decodedToken = await admin.auth().verifyIdToken(token);
        } else {
            // Fallback: decode JWT manually without verification (Local Mock Mode)
            console.warn("⚠️ Firebase Admin not initialized. Decoding token without verification.");
            const payloadBase64 = token.split('.')[1];
            if (!payloadBase64) throw new Error("Invalid JWT Format");
            decodedToken = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
            
            // Firebase ID Tokens commonly store UID in `user_id` or `uid`
            if (!decodedToken.uid) {
                decodedToken.uid = decodedToken.user_id || decodedToken.sub;
            }
        }
        
        req.user = decodedToken; 
        
        next();
    } catch (err) {
        console.error('Firebase Auth Error:', err);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = authMiddleware;