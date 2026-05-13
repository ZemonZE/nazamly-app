// src/middlewares/auth.middleware.js
const admin = require("../config/firebase");

const authMiddleware = async (req, res, next) => {
    // 🛡️ Firebase Authentication
    try {
        // Support token from Authorization header (standard) OR query param (SSE/EventSource fallback)
        const token = req.headers.authorization?.split("Bearer ")[1] || req.query?.token;
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        // Firebase Admin must be initialized — refuse to serve otherwise
        if (!admin.apps || admin.apps.length === 0) {
            console.error("🚨 Firebase Admin not initialized. Rejecting request for security.");
            return res.status(503).json({ message: "Authentication service unavailable" });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
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
