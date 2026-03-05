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