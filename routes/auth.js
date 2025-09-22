const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Register new user (DISABLED - Admin only registration)
router.post('/register', (req, res) => {
    res.status(403).json({
        success: false,
        message: 'Public registration is disabled. Please contact administrator for account creation.'
    });
});

// Login user
router.post('/login',
    authLimiter,
    [
        body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.getByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check if account is active
            if (user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'Account is not active'
                });
            }

            // Verify password
            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Update last login
            await user.updateLastLogin();

            // Generate token
            const token = auth.generateToken(user.id);

            // Log action
            await user.logAction('login', 'User login', req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: user.toJSON(),
                    token
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error logging in',
                error: error.message
            });
        }
    }
);

// Get current user profile
router.get('/profile', auth.requireAuth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user.toJSON()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
});

// Update user profile
router.put('/profile',
    auth.requireAuth,
    [
        body('username')
            .optional()
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be 3-30 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Valid email is required')
            .normalizeEmail()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { username, email } = req.body;
            const updateData = {};

            if (username && username !== req.user.username) {
                const existingUser = await User.getByUsername(username);
                if (existingUser && existingUser.id !== req.user.id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username already taken'
                    });
                }
                updateData.username = username;
            }

            if (email && email !== req.user.email) {
                const existingUser = await User.getByEmail(email);
                if (existingUser && existingUser.id !== req.user.id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email already taken'
                    });
                }
                updateData.email = email;
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes to update'
                });
            }

            await req.user.update(updateData);

            // Log action
            await req.user.logAction('profile_update', `Updated: ${Object.keys(updateData).join(', ')}`, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: req.user.toJSON()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating profile',
                error: error.message
            });
        }
    }
);

// Change password
router.put('/password',
    auth.requireAuth,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { currentPassword, newPassword } = req.body;

            // Verify current password
            const isValidPassword = await req.user.verifyPassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Update password
            await req.user.updatePassword(newPassword);

            // Log action
            await req.user.logAction('password_change', 'Password changed', req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'Password updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating password',
                error: error.message
            });
        }
    }
);

// Get user transactions
router.get('/transactions', auth.requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const transactions = await req.user.getTransactions(limit, offset);

        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching transactions',
            error: error.message
        });
    }
});

// Logout (client-side token removal, server-side logging)
router.post('/logout', auth.requireAuth, async (req, res) => {
    try {
        // Log action
        await req.user.logAction('logout', 'User logout', req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error logging out',
            error: error.message
        });
    }
});

module.exports = router;