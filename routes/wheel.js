const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const db = require('../models/database');
const router = express.Router();

// Rate limiting for wheel spins
const wheelLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 spins per minute
    message: {
        success: false,
        message: 'Too many wheel spins, please wait before spinning again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Wheel segments configuration
const wheelSegments = [
    { value: 500, type: 'credits', weight: 5 },
    { value: 'lose', type: 'lose', weight: 25 },
    { value: 200, type: 'credits', weight: 10 },
    { value: 'win', type: 'special', weight: 15 },
    { value: 300, type: 'credits', weight: 8 },
    { value: 1000, type: 'credits', weight: 2 },
    { value: 'lose', type: 'lose', weight: 25 },
    { value: 100, type: 'credits', weight: 10 }
];

// Calculate total weight
const totalWeight = wheelSegments.reduce((sum, segment) => sum + segment.weight, 0);

// Function to get weighted random result
function getRandomResult() {
    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const segment of wheelSegments) {
        currentWeight += segment.weight;
        if (random <= currentWeight) {
            return segment;
        }
    }

    // Fallback (should never reach here)
    return wheelSegments[1]; // lose
}

// Spin the wheel
router.post('/spin',
    wheelLimiter,
    auth.optionalAuth,
    async (req, res) => {
        try {
            // Get random result
            const result = getRandomResult();
            let prizeAmount = 0;
            let message = '';

            // Process result
            switch (result.type) {
                case 'credits':
                    prizeAmount = result.value;
                    message = `Congratulations! You won ${prizeAmount} credits!`;
                    break;
                case 'special':
                    prizeAmount = Math.floor(Math.random() * 500) + 100; // Random between 100-600
                    message = `Amazing! Special win of ${prizeAmount} credits!`;
                    break;
                case 'lose':
                    message = 'Better luck next time!';
                    break;
            }

            // If user is authenticated, update their balance and log the spin
            if (req.user && prizeAmount > 0) {
                await req.user.addBalance(prizeAmount, `Fortune wheel win: ${prizeAmount} credits`);
                await req.user.logAction('wheel_spin', `Won ${prizeAmount} credits`, req.ip, req.get('User-Agent'));
            }

            // Log the spin in database
            await db.run(`
                INSERT INTO wheel_spins (user_id, result, prize_amount, ip_address)
                VALUES (?, ?, ?, ?)
            `, [req.user?.id || null, result.value.toString(), prizeAmount, req.ip]);

            res.json({
                success: true,
                data: {
                    result: result.value,
                    prize_amount: prizeAmount,
                    message: message,
                    user_balance: req.user ? req.user.balance : null
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error spinning wheel',
                error: error.message
            });
        }
    }
);

// Get wheel statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                COUNT(*) as total_spins,
                SUM(CASE WHEN prize_amount > 0 THEN 1 ELSE 0 END) as winning_spins,
                SUM(prize_amount) as total_prizes,
                AVG(prize_amount) as avg_prize,
                MAX(prize_amount) as max_prize
            FROM wheel_spins
            WHERE spin_time >= datetime('now', '-24 hours')
        `);

        const recentWinners = await db.query(`
            SELECT
                u.username,
                ws.prize_amount,
                ws.spin_time
            FROM wheel_spins ws
            LEFT JOIN users u ON ws.user_id = u.id
            WHERE ws.prize_amount > 0
            ORDER BY ws.spin_time DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                daily_stats: stats[0],
                recent_winners: recentWinners.map(winner => ({
                    username: winner.username || 'Anonymous',
                    prize_amount: winner.prize_amount,
                    time: winner.spin_time
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching wheel statistics',
            error: error.message
        });
    }
});

// Get recent winners for ticker
router.get('/recent-winners', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        const winners = await db.query(`
            SELECT
                u.username,
                ws.prize_amount,
                ws.spin_time
            FROM wheel_spins ws
            LEFT JOIN users u ON ws.user_id = u.id
            WHERE ws.prize_amount > 0
            ORDER BY ws.spin_time DESC
            LIMIT ?
        `, [limit]);

        // Format for ticker display
        const formattedWinners = winners.map((winner, index) => ({
            rank: index + 1,
            name: winner.username || `Player ${Math.floor(Math.random() * 1000)}`,
            amount: `$${winner.prize_amount.toFixed(2)}`
        }));

        res.json({
            success: true,
            data: formattedWinners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recent winners',
            error: error.message
        });
    }
});

// Get user's spin history (authenticated users only)
router.get('/history', auth.requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const spins = await db.query(`
            SELECT result, prize_amount, spin_time
            FROM wheel_spins
            WHERE user_id = ?
            ORDER BY spin_time DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, limit, offset]);

        res.json({
            success: true,
            data: spins,
            count: spins.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching spin history',
            error: error.message
        });
    }
});

module.exports = router;