const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../models/database');

// Game data mapping from Excel
const gameImageMapping = {
    'Firekirin': 'firekirin.png',
    'Orionstar': 'orionstars.jpg',
    'Juwa': 'juwaonline.png',
    'GameVault': 'gamevault.png',
    'CasinoRoyale': 'casinoroyale.png',
    'Vegasweep': 'Vega Sweeps.png',
    'Milkyway': 'milkyway 2.png',
    'Ultra Panda': 'ultrapanda.png',
    'Cash Frenzy': 'cashfrenzy 1.png',
    'Pandamaster': 'Panda Master.jpg',
    'vblink': 'vblink 2.png',
    'River Sweeps': 'riversweeps.png',
    'HighStake': 'Highstake.jpg',
    'VegasX': 'vegas x.png',
    'Game Room': 'Gameroom online.png',
    'Blue Dragon': 'bluedragon.png',
    'Para': 'Paracasino.jpg',
    'River Monster': 'rivermonster 1.png',
    'Moolah': 'moolah.jpg',
    'Sirus': 'sirus.png',
    'Meaga Spin': 'Megaspin.jpg',
    'Egames': 'Egames.png',
    'Loot': 'loot.jpg',
    'Casino Ignite': 'casinoignitee.jpg',
    'Cash Machine': 'cashmachine.png',
    'Vegas Roll': 'vegasroll.png',
    'Win Star': 'winstar.png',
    'Mega Spin': 'Megaspin.jpg',
    'Volo': 'yolo777.png',
    'Joker': 'joker 777.png'
};

// Game descriptions
const gameDescriptions = {
    'Firekirin': 'Exciting fire-themed slot game with blazing jackpots',
    'Orionstar': 'Space adventure casino game with stellar rewards',
    'Juwa': 'Premium online casino experience with top-tier games',
    'GameVault': 'Vault of gaming treasures and unlimited fun',
    'CasinoRoyale': 'Classic casino experience with royal treatment',
    'Vegasweep': 'Vegas-style sweepstakes with big prizes',
    'Milkyway': 'Galactic gaming adventure across the stars',
    'Ultra Panda': 'Panda-themed slot fun with bamboo bonuses',
    'Cash Frenzy': 'Fast-paced cash games with instant wins',
    'Pandamaster': 'Master the panda games and win big',
    'vblink': 'Blink and win big with lightning-fast games',
    'River Sweeps': 'River of winnings flowing your way',
    'HighStake': 'High stakes gaming for serious players',
    'VegasX': 'Next generation Vegas gaming experience',
    'Game Room': 'Online game room with multiple entertainment options',
    'Blue Dragon': 'Mystical dragon adventures with magical rewards',
    'Para': 'Paradise casino gaming at its finest',
    'River Monster': 'Monster wins await in the deep waters',
    'Moolah': 'Mega moolah jackpots and massive payouts',
    'Sirus': 'Stellar gaming experience from another world',
    'Meaga Spin': 'Mega spins with mega rewards',
    'Egames': 'Electronic gaming at its best',
    'Loot': 'Treasure hunting with amazing loot rewards',
    'Casino Ignite': 'Ignite your passion for casino gaming',
    'Cash Machine': 'Turn the machine into your cash generator',
    'Vegas Roll': 'Roll the dice in Vegas style',
    'Win Star': 'Reach for the stars and win big',
    'Mega Spin': 'Mega spins for mega excitement',
    'Volo': 'High-flying gaming action',
    'Joker': 'Wild joker games with unpredictable wins'
};

async function initializeDatabase() {
    try {
        console.log('🚀 Starting database initialization...');

        // Wait for database to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Read games data from JSON file
        const gamesDataPath = path.join(__dirname, '..', 'games_data.json');
        const gamesData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf8'));

        console.log(`📊 Found ${gamesData.length} games to import`);

        // Clear existing games (for fresh install)
        await db.run('DELETE FROM games');
        console.log('🗑️  Cleared existing games');

        // Insert games
        let importedCount = 0;
        for (const gameData of gamesData) {
            const imagePath = gameImageMapping[gameData.Name] || 'placeholder.png';
            const description = gameDescriptions[gameData.Name] || 'Exciting casino game experience';

            try {
                await db.run(`
                    INSERT INTO games (name, description, image_path, game_url, category, min_bet, max_bet, popularity_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    gameData.Name,
                    description,
                    `casino-imade/${imagePath}`,
                    gameData.URL,
                    'casino',
                    1.00,
                    1000.00,
                    Math.floor(Math.random() * 100) + 1 // Random initial popularity
                ]);
                importedCount++;
                console.log(`✅ Imported: ${gameData.Name}`);
            } catch (error) {
                console.error(`❌ Error importing ${gameData.Name}:`, error.message);
            }
        }

        console.log(`🎮 Successfully imported ${importedCount} games`);

        // Create admin user
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@casinoroyal.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

        // Check if admin already exists
        const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 12);
            await db.run(`
                INSERT INTO users (username, email, password_hash, balance, is_admin, is_agent)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['admin', adminEmail, hashedPassword, 10000.00, 1, 1]);

            console.log('👤 Created admin user:');
            console.log(`   Email: ${adminEmail}`);
            console.log(`   Password: ${adminPassword}`);
            console.log('   ⚠️  Please change the default password!');
        } else {
            console.log('👤 Admin user already exists');
        }

        // Create sample users for testing
        const sampleUsers = [
            { username: 'player1', email: 'player1@example.com', password: 'Player123!', balance: 500 },
            { username: 'player2', email: 'player2@example.com', password: 'Player123!', balance: 750 },
            { username: 'agent1', email: 'agent1@example.com', password: 'Agent123!', balance: 1000, is_agent: true }
        ];

        for (const userData of sampleUsers) {
            const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [userData.email]);
            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(userData.password, 12);
                await db.run(`
                    INSERT INTO users (username, email, password_hash, balance, is_admin, is_agent)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    userData.username,
                    userData.email,
                    hashedPassword,
                    userData.balance,
                    userData.is_admin || 0,
                    userData.is_agent || 0
                ]);
                console.log(`👤 Created sample user: ${userData.username}`);
            }
        }

        // Add some sample wheel spins
        console.log('🎡 Adding sample wheel spin data...');
        const sampleSpins = [
            { result: '500', prize_amount: 500 },
            { result: '200', prize_amount: 200 },
            { result: 'win', prize_amount: 350 },
            { result: '100', prize_amount: 100 },
            { result: 'lose', prize_amount: 0 },
            { result: '300', prize_amount: 300 }
        ];

        for (const spin of sampleSpins) {
            await db.run(`
                INSERT INTO wheel_spins (user_id, result, prize_amount, spin_time)
                VALUES (?, ?, ?, datetime('now', '-' || abs(random() % 24) || ' hours'))
            `, [null, spin.result, spin.prize_amount]);
        }

        console.log('🎡 Added sample wheel spin data');

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\n📝 Summary:');
        console.log(`   • ${importedCount} games imported`);
        console.log('   • Admin user created');
        console.log('   • Sample users created');
        console.log('   • Sample data added');
        console.log('\n🚀 You can now start the server with: npm start');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase().then(() => {
        process.exit(0);
    });
}

module.exports = initializeDatabase;