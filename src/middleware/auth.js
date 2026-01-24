const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'; // Default fallback

const requireAdmin = (req, res, next) => {
    const token = req.headers['x-admin-token'];

    // Simple Token Check (In real app, use JWT)
    // For now, token IS the password hash or just a specific string
    if (token === 'valid-admin-token') {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Admin access only" });
    }
};

module.exports = { requireAdmin, ADMIN_PASSWORD };
