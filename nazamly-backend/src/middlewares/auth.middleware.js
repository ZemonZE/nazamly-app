// src/middlewares/auth.middleware.js
const admin = require("../config/firebase");

const authMiddleware = async (req, res, next) => {
    // 🛡️ Firebase Authentication
    try {
        const token = req.headers.authorization?.split("Bearer ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // decodedToken contains 'uid', which is the Firebase User ID
        req.user = decodedToken; 
        
        next();
    } catch (err) {
        console.error('Firebase Auth Error:', err);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = authMiddleware;