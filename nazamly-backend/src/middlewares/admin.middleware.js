const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user.admin) {
            return res.status(403).json({ 
                message: 'Forbidden: Admin access required' 
            });
        }
        
        next();
    } catch (err) {
        console.error('Admin authorization error:', err);
        return res.status(500).json({ 
            message: 'Authorization check failed' 
        });
    }
};

module.exports = requireAdmin;
