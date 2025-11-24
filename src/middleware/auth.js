const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { checkApprovalStatus } = require('./approval');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies.token) {
        token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'No user found with this token'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account has been deactivated'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }

        next();
    };
};

// Check if user is verified
const requireEmailVerification = (req, res, next) => {
    if (!req.user.isEmailVerified) {
        return res.status(403).json({
            success: false,
            message: 'Please verify your email address to access this feature'
        });
    }
    next();
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (user && user.isActive) {
                req.user = user;
            }
        } catch (error) {
            // Ignore token errors for optional auth
            console.log('Optional auth token error:', error.message);
        }
    }

    next();
};

// Protect routes with approval check
const protectWithApproval = async (req, res, next) => {
    // First check authentication
    await protect(req, res, (err) => {
        if (err) return;
        // Then check approval status
        checkApprovalStatus(req, res, next);
    });
};

module.exports = {
    protect,
    authorize,
    requireEmailVerification,
    optionalAuth,
    protectWithApproval
};
