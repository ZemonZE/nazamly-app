// src/middlewares/auth.middleware.js
const admin = require("../config/firebase");

const authMiddleware = async (req, res, next) => {
    // 🛡️ Firebase Authentication
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
        if (err.code === 'auth/id-token-expired') {
            console.warn('Firebase Auth: Token expired. Returning 401.');
            return res.status(401).json({ message: "Unauthorized - Token Expired" });
        }
        console.error('Firebase Auth Error:', err.message || err);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = authMiddleware;