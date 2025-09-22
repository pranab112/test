const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Game = require('../models/Game');
const auth = require('../middleware/auth');
const db = require('../models/database');
const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(auth.requireAuth, auth.requireAdmin);

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        // User statistics
        const userStats = await User.getStats();

        // Game statistics
        const gameStats = await Game.getStats();

        // Revenue statistics
        const revenueStats = await db.query(`
            SELECT
                SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
                SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
                COUNT(CASE WHEN type = 'deposit' THEN 1 END) as deposit_count,
                COUNT(CASE WHEN type = 'withdrawal' THEN 1 END) as withdrawal_count
            FROM transactions
            WHERE created_at >= datetime('now', '-30 days')
        `);

        // Activity statistics
        const activityStats = await db.query(`
            SELECT
                COUNT(*) as total_spins,
                SUM(prize_amount) as total_prizes,
                COUNT(CASE WHEN prize_amount > 0 THEN 1 END) as winning_spins
            FROM wheel_spins
            WHERE spin_time >= datetime('now', '-30 days')
        `);

        // Recent activity
        const recentActivity = await db.query(`
            SELECT
                ul.action,
                ul.details,
                ul.created_at,
                u.username
            FROM user_logs ul
            JOIN users u ON ul.user_id = u.id
            ORDER BY ul.created_at DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                user_stats: userStats,
                game_stats: gameStats,
                revenue_stats: revenueStats[0],
                activity_stats: activityStats[0],
                recent_activity: recentActivity
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
});

// User management
router.get('/users', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;

        let users;
        if (search) {
            const searchResults = await db.query(`
                SELECT id, username, email, balance, is_admin, is_agent, created_at, updated_at, last_login, status
                FROM users
                WHERE username LIKE ? OR email LIKE ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [`%${search}%`, `%${search}%`, limit, offset]);
            users = searchResults.map(row => new User({...row, password_hash: ''}));
        } else {
            users = await User.getAll(limit, offset);
        }

        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
});

// Get specific user details
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.getById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's transactions
        const transactions = await user.getTransactions(20);

        // Get user's logs
        const logs = await db.query(`
            SELECT action, details, ip_address, created_at
            FROM user_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `, [user.id]);

        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                transactions: transactions,
                logs: logs
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user details',
            error: error.message
        });
    }
});

// Create new user (admin only)
router.post('/users',
    [
        body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('balance').optional().isFloat({ min: 0 }).withMessage('Balance must be non-negative'),
        body('is_admin').optional().isBoolean(),
        body('is_agent').optional().isBoolean()
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

            const { username, email, password, balance = 100, is_admin = false, is_agent = false } = req.body;

            // Check if user already exists
            const existingUser = await User.getByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            const existingUsername = await User.getByUsername(username);
            if (existingUsername) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already taken'
                });
            }

            // Create user
            const userData = {
                username,
                email,
                password,
                balance,
                is_admin,
                is_agent
            };

            const user = await User.create(userData);

            // Log admin action
            await req.user.logAction('admin_user_create', `Created user: ${username}`, req.ip, req.get('User-Agent'));

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: user.toJSON()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating user',
                error: error.message
            });
        }
    }
);

// Update user (admin privileges)
router.put('/users/:id',
    [
        body('username').optional().trim().isLength({ min: 3, max: 30 }),
        body('email').optional().isEmail().normalizeEmail(),
        body('balance').optional().isFloat({ min: 0 }),
        body('is_admin').optional().isBoolean(),
        body('is_agent').optional().isBoolean(),
        body('status').optional().isIn(['active', 'suspended', 'banned'])
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

            const user = await User.getById(req.params.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Prevent removing admin privileges from yourself
            if (req.body.hasOwnProperty('is_admin') && user.id === req.user.id && !req.body.is_admin) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove admin privileges from yourself'
                });
            }

            await user.update(req.body);

            // Log admin action
            await req.user.logAction('admin_user_update', `Updated user: ${user.username}`, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'User updated successfully',
                data: user.toJSON()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating user',
                error: error.message
            });
        }
    }
);

// Adjust user balance
router.post('/users/:id/balance',
    [
        body('amount').isFloat().withMessage('Amount must be a number'),
        body('type').isIn(['add', 'subtract']).withMessage('Type must be add or subtract'),
        body('description').optional().isLength({ max: 200 }).withMessage('Description too long')
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

            const user = await User.getById(req.params.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const { amount, type, description } = req.body;
            const adjustmentDescription = description || `Admin ${type} balance adjustment`;

            if (type === 'add') {
                await user.addBalance(amount, adjustmentDescription);
            } else {
                await user.deductBalance(amount, adjustmentDescription);
            }

            // Log admin action
            await req.user.logAction('admin_balance_adjust', `${type} ${amount} to ${user.username}`, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'Balance adjusted successfully',
                data: {
                    new_balance: user.balance,
                    adjustment: amount,
                    type: type
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error adjusting balance',
                error: error.message
            });
        }
    }
);

// Game management
router.get('/games', async (req, res) => {
    try {
        // Get all games including inactive ones
        const games = await db.query(`
            SELECT * FROM games
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            data: games.map(game => new Game(game)),
            count: games.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching games',
            error: error.message
        });
    }
});

// System logs
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const action = req.query.action;

        let sql = `
            SELECT
                ul.id,
                ul.action,
                ul.details,
                ul.ip_address,
                ul.created_at,
                u.username
            FROM user_logs ul
            JOIN users u ON ul.user_id = u.id
        `;
        let params = [];

        if (action) {
            sql += ' WHERE ul.action LIKE ?';
            params.push(`%${action}%`);
        }

        sql += ' ORDER BY ul.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const logs = await db.query(sql, params);

        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching logs',
            error: error.message
        });
    }
});

// Transactions overview
router.get('/transactions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const type = req.query.type;

        let sql = `
            SELECT
                t.id,
                t.type,
                t.amount,
                t.balance_before,
                t.balance_after,
                t.description,
                t.status,
                t.created_at,
                u.username
            FROM transactions t
            JOIN users u ON t.user_id = u.id
        `;
        let params = [];

        if (type) {
            sql += ' WHERE t.type = ?';
            params.push(type);
        }

        sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const transactions = await db.query(sql, params);

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

// System settings (placeholder for future implementation)
router.get('/settings', async (req, res) => {
    try {
        const settings = {
            system_name: 'Casino Royal',
            maintenance_mode: false,
            registration_enabled: true,
            welcome_bonus: 100,
            max_bet_limit: 10000,
            wheel_spin_limit: 3,
            wheel_spin_window: 60000 // 1 minute
        };

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching settings',
            error: error.message
        });
    }
});

module.exports = router;