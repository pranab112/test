const db = require('./database');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.balance = data.balance;
        this.is_admin = data.is_admin;
        this.is_agent = data.is_agent;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.last_login = data.last_login;
        this.status = data.status;
    }

    // Get user by ID
    static async getById(id) {
        try {
            const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
            return row ? new User(row) : null;
        } catch (error) {
            throw new Error(`Error fetching user: ${error.message}`);
        }
    }

    // Get user by email
    static async getByEmail(email) {
        try {
            const row = await db.get('SELECT * FROM users WHERE email = ?', [email]);
            return row ? new User(row) : null;
        } catch (error) {
            throw new Error(`Error fetching user by email: ${error.message}`);
        }
    }

    // Get user by username
    static async getByUsername(username) {
        try {
            const row = await db.get('SELECT * FROM users WHERE username = ?', [username]);
            return row ? new User(row) : null;
        } catch (error) {
            throw new Error(`Error fetching user by username: ${error.message}`);
        }
    }

    // Create new user
    static async create(userData) {
        try {
            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

            const sql = `
                INSERT INTO users (username, email, password_hash, balance, is_admin, is_agent)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const params = [
                userData.username,
                userData.email,
                hashedPassword,
                userData.balance || 0.00,
                userData.is_admin || false,
                userData.is_agent || false
            ];

            const result = await db.run(sql, params);
            return await User.getById(result.id);
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('Username or email already exists');
            }
            throw new Error(`Error creating user: ${error.message}`);
        }
    }

    // Verify password
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password_hash);
        } catch (error) {
            throw new Error(`Error verifying password: ${error.message}`);
        }
    }

    // Update user
    async update(updateData) {
        try {
            const allowedFields = ['username', 'email', 'balance', 'is_admin', 'is_agent', 'status'];
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

            const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            await db.run(sql, params);

            // Refresh object data
            const updated = await User.getById(this.id);
            Object.assign(this, updated);
            return this;
        } catch (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            await db.run(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, this.id]
            );

            this.password_hash = hashedPassword;
            return this;
        } catch (error) {
            throw new Error(`Error updating password: ${error.message}`);
        }
    }

    // Update last login
    async updateLastLogin() {
        try {
            await db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );
            this.last_login = new Date().toISOString();
            return this;
        } catch (error) {
            throw new Error(`Error updating last login: ${error.message}`);
        }
    }

    // Add balance
    async addBalance(amount, description = 'Balance added') {
        try {
            const oldBalance = this.balance;
            const newBalance = parseFloat(oldBalance) + parseFloat(amount);

            await db.run('BEGIN TRANSACTION');

            // Update user balance
            await db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, this.id]);

            // Log transaction
            await db.run(`
                INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [this.id, 'deposit', amount, oldBalance, newBalance, description]);

            await db.run('COMMIT');

            this.balance = newBalance;
            return this;
        } catch (error) {
            await db.run('ROLLBACK');
            throw new Error(`Error adding balance: ${error.message}`);
        }
    }

    // Deduct balance
    async deductBalance(amount, description = 'Balance deducted') {
        try {
            const oldBalance = this.balance;
            const newBalance = parseFloat(oldBalance) - parseFloat(amount);

            if (newBalance < 0) {
                throw new Error('Insufficient balance');
            }

            await db.run('BEGIN TRANSACTION');

            // Update user balance
            await db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, this.id]);

            // Log transaction
            await db.run(`
                INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [this.id, 'withdrawal', amount, oldBalance, newBalance, description]);

            await db.run('COMMIT');

            this.balance = newBalance;
            return this;
        } catch (error) {
            await db.run('ROLLBACK');
            throw new Error(`Error deducting balance: ${error.message}`);
        }
    }

    // Get user transactions
    async getTransactions(limit = 50, offset = 0) {
        try {
            const sql = `
                SELECT * FROM transactions
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
            return await db.query(sql, [this.id, limit, offset]);
        } catch (error) {
            throw new Error(`Error fetching transactions: ${error.message}`);
        }
    }

    // Get all users (admin only)
    static async getAll(limit = 50, offset = 0) {
        try {
            const sql = `
                SELECT id, username, email, balance, is_admin, is_agent, created_at, updated_at, last_login, status
                FROM users
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
            const rows = await db.query(sql, [limit, offset]);
            return rows.map(row => new User({...row, password_hash: ''}));
        } catch (error) {
            throw new Error(`Error fetching users: ${error.message}`);
        }
    }

    // Get user statistics
    static async getStats() {
        try {
            const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
            const activeUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE status = "active"');
            const totalBalance = await db.get('SELECT SUM(balance) as total FROM users');

            return {
                total_users: totalUsers.count,
                active_users: activeUsers.count,
                total_balance: totalBalance.total || 0
            };
        } catch (error) {
            throw new Error(`Error fetching user stats: ${error.message}`);
        }
    }

    // Log user action
    async logAction(action, details = null, ipAddress = null, userAgent = null) {
        try {
            await db.run(`
                INSERT INTO user_logs (user_id, action, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            `, [this.id, action, details, ipAddress, userAgent]);
        } catch (error) {
            console.error('Error logging user action:', error);
        }
    }

    // Convert to JSON (for API responses) - exclude sensitive data
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            balance: this.balance,
            is_admin: this.is_admin,
            is_agent: this.is_agent,
            created_at: this.created_at,
            updated_at: this.updated_at,
            last_login: this.last_login,
            status: this.status
        };
    }
}

module.exports = User;