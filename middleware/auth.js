const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to extract user from JWT token (optional)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.getById(decoded.userId);

            if (user && user.status === 'active') {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Token invalid or expired, continue without user
        next();
    }
};

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.getById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Account is not active.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

// Middleware to require admin privileges
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required.'
        });
    }

    next();
};

// Middleware to require agent privileges
const requireAgent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (!req.user.is_agent && !req.user.is_admin) {
        return res.status(403).json({
            success: false,
            message: 'Agent privileges required.'
        });
    }

    next();
};

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Verify JWT token
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
    optionalAuth,
    requireAuth,
    requireAdmin,
    requireAgent,
    generateToken,
    verifyToken
};