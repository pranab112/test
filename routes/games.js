const express = require('express');
const { body, validationResult } = require('express-validator');
const Game = require('../models/Game');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all games
router.get('/', async (req, res) => {
    try {
        const { category, search, limit, offset } = req.query;
        let games;

        if (search) {
            games = await Game.search(search, category);
        } else {
            games = await Game.getAll(category);
        }

        // Apply pagination if specified
        if (limit) {
            const startIndex = parseInt(offset) || 0;
            const endIndex = startIndex + parseInt(limit);
            games = games.slice(startIndex, endIndex);
        }

        res.json({
            success: true,
            data: games,
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

// Get popular games
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const games = await Game.getPopular(limit);

        res.json({
            success: true,
            data: games,
            count: games.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching popular games',
            error: error.message
        });
    }
});

// Get game statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await Game.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching game statistics',
            error: error.message
        });
    }
});

// Get game by ID
router.get('/:id', async (req, res) => {
    try {
        const game = await Game.getById(req.params.id);

        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found'
            });
        }

        res.json({
            success: true,
            data: game
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching game',
            error: error.message
        });
    }
});

// Track game play (increment popularity)
router.post('/:id/play', async (req, res) => {
    try {
        const game = await Game.getById(req.params.id);

        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found'
            });
        }

        if (!game.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Game is not available'
            });
        }

        // Increment popularity score
        await game.incrementPopularity();

        // Log game session if user is authenticated
        if (req.user) {
            const db = require('../models/database');
            await db.run(`
                INSERT INTO game_sessions (user_id, game_id, session_start)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `, [req.user.id, game.id]);

            // Log user action
            await req.user.logAction('game_play', `Started playing ${game.name}`, req.ip, req.get('User-Agent'));
        }

        res.json({
            success: true,
            message: 'Game accessed successfully',
            data: {
                game_url: game.game_url,
                game_name: game.name
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error accessing game',
            error: error.message
        });
    }
});

// Create new game (admin only)
router.post('/',
    auth.requireAuth,
    auth.requireAdmin,
    [
        body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
        body('game_url').isURL().withMessage('Valid game URL is required'),
        body('description').optional().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
        body('category').optional().isIn(['casino', 'slots', 'poker', 'blackjack', 'roulette', 'other']).withMessage('Invalid category'),
        body('min_bet').optional().isFloat({ min: 0.01 }).withMessage('Minimum bet must be positive'),
        body('max_bet').optional().isFloat({ min: 0.01 }).withMessage('Maximum bet must be positive')
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

            const game = await Game.create(req.body);

            // Log admin action
            await req.user.logAction('game_create', `Created game: ${game.name}`, req.ip, req.get('User-Agent'));

            res.status(201).json({
                success: true,
                message: 'Game created successfully',
                data: game
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating game',
                error: error.message
            });
        }
    }
);

// Update game (admin only)
router.put('/:id',
    auth.requireAuth,
    auth.requireAdmin,
    [
        body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
        body('game_url').optional().isURL().withMessage('Valid game URL is required'),
        body('description').optional().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
        body('category').optional().isIn(['casino', 'slots', 'poker', 'blackjack', 'roulette', 'other']).withMessage('Invalid category'),
        body('min_bet').optional().isFloat({ min: 0.01 }).withMessage('Minimum bet must be positive'),
        body('max_bet').optional().isFloat({ min: 0.01 }).withMessage('Maximum bet must be positive'),
        body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
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

            const game = await Game.getById(req.params.id);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            await game.update(req.body);

            // Log admin action
            await req.user.logAction('game_update', `Updated game: ${game.name}`, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'Game updated successfully',
                data: game
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating game',
                error: error.message
            });
        }
    }
);

// Delete game (admin only)
router.delete('/:id',
    auth.requireAuth,
    auth.requireAdmin,
    async (req, res) => {
        try {
            const game = await Game.getById(req.params.id);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found'
                });
            }

            await game.delete();

            // Log admin action
            await req.user.logAction('game_delete', `Deleted game: ${game.name}`, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                message: 'Game deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting game',
                error: error.message
            });
        }
    }
);

module.exports = router;