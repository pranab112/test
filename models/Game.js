const db = require('./database');

class Game {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.image_path = data.image_path;
        this.game_url = data.game_url;
        this.category = data.category;
        this.is_active = data.is_active;
        this.min_bet = data.min_bet;
        this.max_bet = data.max_bet;
        this.popularity_score = data.popularity_score;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Get all active games
    static async getAll(category = null) {
        try {
            let sql = 'SELECT * FROM games WHERE is_active = 1';
            let params = [];

            if (category) {
                sql += ' AND category = ?';
                params.push(category);
            }

            sql += ' ORDER BY popularity_score DESC, name ASC';

            const rows = await db.query(sql, params);
            return rows.map(row => new Game(row));
        } catch (error) {
            throw new Error(`Error fetching games: ${error.message}`);
        }
    }

    // Get game by ID
    static async getById(id) {
        try {
            const row = await db.get('SELECT * FROM games WHERE id = ?', [id]);
            return row ? new Game(row) : null;
        } catch (error) {
            throw new Error(`Error fetching game: ${error.message}`);
        }
    }

    // Get game by name
    static async getByName(name) {
        try {
            const row = await db.get('SELECT * FROM games WHERE name = ?', [name]);
            return row ? new Game(row) : null;
        } catch (error) {
            throw new Error(`Error fetching game by name: ${error.message}`);
        }
    }

    // Create new game
    static async create(gameData) {
        try {
            const sql = `
                INSERT INTO games (name, description, image_path, game_url, category, min_bet, max_bet)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                gameData.name,
                gameData.description || '',
                gameData.image_path || '',
                gameData.game_url,
                gameData.category || 'casino',
                gameData.min_bet || 1.00,
                gameData.max_bet || 1000.00
            ];

            const result = await db.run(sql, params);
            return await Game.getById(result.id);
        } catch (error) {
            throw new Error(`Error creating game: ${error.message}`);
        }
    }

    // Update game
    async update(updateData) {
        try {
            const allowedFields = ['name', 'description', 'image_path', 'game_url', 'category', 'is_active', 'min_bet', 'max_bet'];
            const updateFields = [];
            const params = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    updateFields.push(`${key} = ?`);
                    params.push(value);
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(this.id);

            const sql = `UPDATE games SET ${updateFields.join(', ')} WHERE id = ?`;
            await db.run(sql, params);

            // Refresh object data
            const updated = await Game.getById(this.id);
            Object.assign(this, updated);
            return this;
        } catch (error) {
            throw new Error(`Error updating game: ${error.message}`);
        }
    }

    // Delete game (soft delete by setting is_active to false)
    async delete() {
        try {
            await db.run('UPDATE games SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [this.id]);
            this.is_active = false;
            return true;
        } catch (error) {
            throw new Error(`Error deleting game: ${error.message}`);
        }
    }

    // Increment popularity score
    async incrementPopularity() {
        try {
            await db.run('UPDATE games SET popularity_score = popularity_score + 1 WHERE id = ?', [this.id]);
            this.popularity_score += 1;
            return this;
        } catch (error) {
            throw new Error(`Error updating popularity: ${error.message}`);
        }
    }

    // Get popular games
    static async getPopular(limit = 10) {
        try {
            const sql = `
                SELECT * FROM games
                WHERE is_active = 1
                ORDER BY popularity_score DESC, name ASC
                LIMIT ?
            `;
            const rows = await db.query(sql, [limit]);
            return rows.map(row => new Game(row));
        } catch (error) {
            throw new Error(`Error fetching popular games: ${error.message}`);
        }
    }

    // Search games
    static async search(searchTerm, category = null) {
        try {
            let sql = `
                SELECT * FROM games
                WHERE is_active = 1
                AND (name LIKE ? OR description LIKE ?)
            `;
            let params = [`%${searchTerm}%`, `%${searchTerm}%`];

            if (category) {
                sql += ' AND category = ?';
                params.push(category);
            }

            sql += ' ORDER BY popularity_score DESC, name ASC';

            const rows = await db.query(sql, params);
            return rows.map(row => new Game(row));
        } catch (error) {
            throw new Error(`Error searching games: ${error.message}`);
        }
    }

    // Get games statistics
    static async getStats() {
        try {
            const totalGames = await db.get('SELECT COUNT(*) as count FROM games WHERE is_active = 1');
            const categories = await db.query('SELECT category, COUNT(*) as count FROM games WHERE is_active = 1 GROUP BY category');
            const topGames = await Game.getPopular(5);

            return {
                total_games: totalGames.count,
                categories: categories,
                top_games: topGames
            };
        } catch (error) {
            throw new Error(`Error fetching game stats: ${error.message}`);
        }
    }

    // Convert to JSON (for API responses)
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            image_path: this.image_path,
            game_url: this.game_url,
            category: this.category,
            is_active: this.is_active,
            min_bet: this.min_bet,
            max_bet: this.max_bet,
            popularity_score: this.popularity_score,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Game;