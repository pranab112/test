const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get user balance (authenticated users only)
router.get('/balance', auth.requireAuth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                balance: req.user.balance
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching balance',
            error: error.message
        });
    }
});

// Add balance (for demo purposes - in production this would be payment integration)
router.post('/add-balance',
    auth.requireAuth,
    [
        body('amount')
            .isFloat({ min: 1, max: 10000 })
            .withMessage('Amount must be between 1 and 10000')
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

            const { amount } = req.body;

            // In production, this would integrate with payment processor
            await req.user.addBalance(amount, 'Balance added via demo system');

            // Log action
            await req.user.logAction('balance_add', `Added ${amount} credits`, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'Balance added successfully',
                data: {
                    new_balance: req.user.balance,
                    amount_added: amount
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error adding balance',
                error: error.message
            });
        }
    }
);

// Get user statistics
router.get('/stats', auth.requireAuth, async (req, res) => {
    try {
        const db = require('../models/database');

        // Get user's game sessions
        const gameSessions = await db.query(`
            SELECT
                COUNT(*) as total_sessions,
                SUM(total_bet) as total_bet,
                SUM(total_win) as total_win,
                COUNT(DISTINCT game_id) as games_played
            FROM game_sessions
            WHERE user_id = ?
        `, [req.user.id]);

        // Get user's wheel spins
        const wheelStats = await db.query(`
            SELECT
                COUNT(*) as total_spins,
                SUM(prize_amount) as total_winnings,
                COUNT(CASE WHEN prize_amount > 0 THEN 1 END) as winning_spins
            FROM wheel_spins
            WHERE user_id = ?
        `, [req.user.id]);

        // Get recent activity
        const recentActivity = await db.query(`
            SELECT action, details, created_at
            FROM user_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                user_info: {
                    username: req.user.username,
                    email: req.user.email,
                    balance: req.user.balance,
                    member_since: req.user.created_at,
                    last_login: req.user.last_login
                },
                game_stats: gameSessions[0] || {
                    total_sessions: 0,
                    total_bet: 0,
                    total_win: 0,
                    games_played: 0
                },
                wheel_stats: wheelStats[0] || {
                    total_spins: 0,
                    total_winnings: 0,
                    winning_spins: 0
                },
                recent_activity: recentActivity
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics',
            error: error.message
        });
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const db = require('../models/database');
        const period = req.query.period || 'all'; // 'day', 'week', 'month', 'all'

        let dateFilter = '';
        switch (period) {
            case 'day':
                dateFilter = "AND ws.spin_time >= datetime('now', '-1 day')";
                break;
            case 'week':
                dateFilter = "AND ws.spin_time >= datetime('now', '-7 days')";
                break;
            case 'month':
                dateFilter = "AND ws.spin_time >= datetime('now', '-1 month')";
                break;
            default:
                dateFilter = '';
        }

        const leaderboard = await db.query(`
            SELECT
                u.username,
                SUM(ws.prize_amount) as total_winnings,
                COUNT(ws.id) as total_spins,
                COUNT(CASE WHEN ws.prize_amount > 0 THEN 1 END) as winning_spins
            FROM users u
            JOIN wheel_spins ws ON u.id = ws.user_id
            WHERE ws.prize_amount > 0 ${dateFilter}
            GROUP BY u.id, u.username
            ORDER BY total_winnings DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                period: period,
                leaderboard: leaderboard.map((entry, index) => ({
                    rank: index + 1,
                    username: entry.username,
                    total_winnings: entry.total_winnings,
                    total_spins: entry.total_spins,
                    winning_spins: entry.winning_spins,
                    win_rate: entry.total_spins > 0 ? ((entry.winning_spins / entry.total_spins) * 100).toFixed(1) : '0.0'
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
            error: error.message
        });
    }
});

// Get user's game history
router.get('/game-history', auth.requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const db = require('../models/database');
        const gameHistory = await db.query(`
            SELECT
                gs.id,
                g.name as game_name,
                gs.session_start,
                gs.session_end,
                gs.total_bet,
                gs.total_win,
                gs.status
            FROM game_sessions gs
            JOIN games g ON gs.game_id = g.id
            WHERE gs.user_id = ?
            ORDER BY gs.session_start DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, limit, offset]);

        res.json({
            success: true,
            data: gameHistory,
            count: gameHistory.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching game history',
            error: error.message
        });
    }
});

module.exports = router;