// src/middlewares/admin.middleware.js

/**
 * Admin Authorization Middleware
 * Verifies that the authenticated user has admin custom claim in Firebase.
 * Must be used AFTER authMiddleware.
 */
const requireAdmin = async (req, res, next) => {
    try {
        // req.user comes from authMiddleware (decoded Firebase token)
        // Custom claims are included in the decoded token
        
        if (!req.user.admin) {
            return res.status(403).json({ 
                message: 'Forbidden: Admin access required' 
            });
        }
        
        // Admin verified via Firebase custom claim
        next();
    } catch (err) {
        console.error('Admin authorization error:', err);
        return res.status(500).json({ 
            message: 'Authorization check failed' 
        });
    }
};

module.exports = requireAdmin;
