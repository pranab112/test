// Dashboard JavaScript
let currentGameData = null;
let userStats = {};
let gameHistory = [];
let recentTransactions = [];

// DOM Elements
const userInfo = document.getElementById('userInfo');
const welcomeUsername = document.getElementById('welcomeUsername');
const headerUsername = document.getElementById('headerUsername');
const headerBalance = document.getElementById('headerBalance');
const totalBalance = document.getElementById('totalBalance');
const currentBalance = document.getElementById('currentBalance');
const gamesPlayed = document.getElementById('gamesPlayed');
const totalWinnings = document.getElementById('totalWinnings');
const winStreak = document.getElementById('winStreak');
const dashboardGamesGrid = document.getElementById('dashboardGamesGrid');
const gameHistoryTable = document.getElementById('gameHistoryTable');
const historyTableBody = document.getElementById('historyTableBody');
const recentTransactionsList = document.getElementById('recentTransactionsList');
const gameSearch = document.getElementById('gameSearch');
const historyPeriod = document.getElementById('historyPeriod');

// Modal elements
const addBalanceModal = document.getElementById('addBalanceModal');
const gameLaunchModal = document.getElementById('gameLaunchModal');
const addBalanceForm = document.getElementById('addBalanceForm');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 1000);

    try {
        await initializeDashboard();
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
});

// Initialize Dashboard Data
async function initializeDashboard() {
    try {
        // Load user profile
        await loadUserProfile();

        // Load user stats
        await loadUserStats();

        // Load games
        await loadGames();

        // Load game history
        await loadGameHistory();

        // Load recent transactions
        await loadRecentTransactions();

        // Setup event listeners
        setupEventListeners();

        showNotification('Dashboard loaded successfully', 'success');
    } catch (error) {
        throw error;
    }
}

// Load User Profile
async function loadUserProfile() {
    try {
        const response = await apiCall('/auth/profile');
        currentUser = response.data;

        // Update UI elements
        welcomeUsername.textContent = currentUser.username;
        headerUsername.textContent = currentUser.username;
        updateBalanceDisplay(currentUser.balance);

    } catch (error) {
        console.error('Failed to load user profile:', error);
        throw error;
    }
}

// Load User Statistics
async function loadUserStats() {
    try {
        const response = await apiCall('/users/stats');
        userStats = response.data;

        // Update stats display
        gamesPlayed.textContent = userStats.game_stats.games_played || 0;
        totalWinnings.textContent = (userStats.game_stats.total_win || 0).toFixed(2);

        // Calculate win streak (simplified)
        const winnings = userStats.game_stats.total_win || 0;
        const bets = userStats.game_stats.total_bet || 0;
        winStreak.textContent = winnings > bets ? Math.floor((winnings - bets) / 100) : 0;

    } catch (error) {
        console.error('Failed to load user stats:', error);
        // Continue with default values
    }
}

// Load Games
async function loadGames() {
    try {
        const response = await apiCall('/games');
        games = response.data;
        displayGames(games);
    } catch (error) {
        console.error('Failed to load games:', error);
        dashboardGamesGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load games</p>
            </div>`;
    }
}

// Display Games
function displayGames(gamesToDisplay) {
    if (!gamesToDisplay || gamesToDisplay.length === 0) {
        dashboardGamesGrid.innerHTML = `
            <div class="no-games">
                <i class="fas fa-gamepad"></i>
                <p>No games available</p>
            </div>`;
        return;
    }

    dashboardGamesGrid.innerHTML = gamesToDisplay.map(game => `
        <div class="game-card" onclick="openGameModal(${game.id})">
            <img src="${game.image_path}" alt="${game.name}" class="game-card-image"
                 onerror="this.src='https://via.placeholder.com/280x160/1a1a2e/FFD700?text=${encodeURIComponent(game.name)}'">
            <div class="game-card-content">
                <h3 class="game-card-title">${game.name}</h3>
                <p class="game-card-description">${game.description}</p>
                <div class="game-card-footer">
                    <span class="game-bet-range">$${game.min_bet} - $${game.max_bet}</span>
                    <button class="play-btn" onclick="event.stopPropagation(); openGameModal(${game.id})">
                        <i class="fas fa-play"></i> Play
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Load Game History
async function loadGameHistory() {
    try {
        const response = await apiCall('/users/game-history');
        gameHistory = response.data;
        displayGameHistory(gameHistory);
    } catch (error) {
        console.error('Failed to load game history:', error);
        historyTableBody.innerHTML = `
            <tr class="error-row">
                <td colspan="7">
                    <i class="fas fa-exclamation-circle"></i>
                    Failed to load game history
                </td>
            </tr>`;
    }
}

// Display Game History
function displayGameHistory(historyData) {
    if (!historyData || historyData.length === 0) {
        historyTableBody.innerHTML = `
            <tr class="no-data">
                <td colspan="7">
                    <i class="fas fa-info-circle"></i>
                    No game history found
                </td>
            </tr>`;
        return;
    }

    historyTableBody.innerHTML = historyData.map(session => {
        const startTime = new Date(session.session_start);
        const endTime = session.session_end ? new Date(session.session_end) : new Date();
        const duration = calculateDuration(startTime, endTime);
        const netResult = (session.total_win || 0) - (session.total_bet || 0);
        const netClass = netResult >= 0 ? 'net-positive' : 'net-negative';
        const statusClass = session.status === 'active' ? 'status-active' : 'status-completed';

        return `
            <tr>
                <td>${session.game_name}</td>
                <td>${formatDateTime(startTime)}</td>
                <td>${duration}</td>
                <td>$${(session.total_bet || 0).toFixed(2)}</td>
                <td>$${(session.total_win || 0).toFixed(2)}</td>
                <td class="${netClass}">$${netResult.toFixed(2)}</td>
                <td class="${statusClass}">${capitalizeFirst(session.status)}</td>
            </tr>`;
    }).join('');
}

// Load Recent Transactions
async function loadRecentTransactions() {
    try {
        const response = await apiCall('/auth/transactions?limit=5');
        recentTransactions = response.data;
        displayRecentTransactions(recentTransactions);
    } catch (error) {
        console.error('Failed to load recent transactions:', error);
        recentTransactionsList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load transactions</p>
            </div>`;
    }
}

// Display Recent Transactions
function displayRecentTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        recentTransactionsList.innerHTML = `
            <div class="no-transactions">
                <i class="fas fa-info-circle"></i>
                <p>No recent transactions</p>
            </div>`;
        return;
    }

    recentTransactionsList.innerHTML = transactions.map(transaction => {
        const isPositive = transaction.type === 'deposit' || transaction.type === 'win';
        const icon = getTransactionIcon(transaction.type);
        const amountClass = isPositive ? 'positive' : 'negative';
        const amountPrefix = isPositive ? '+' : '-';

        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${capitalizeFirst(transaction.type)}</h4>
                        <p>${transaction.description || 'No description'}</p>
                        <small>${formatDateTime(new Date(transaction.created_at))}</small>
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountPrefix}$${Math.abs(transaction.amount).toFixed(2)}
                </div>
            </div>`;
    }).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    // Game search
    gameSearch.addEventListener('input', filterGames);

    // History period filter
    historyPeriod.addEventListener('change', filterGameHistory);

    // Add balance form
    addBalanceForm.addEventListener('submit', handleAddBalance);

    // Modal close on outside click
    window.addEventListener('click', function(event) {
        if (event.target === addBalanceModal) {
            closeAddBalanceModal();
        }
        if (event.target === gameLaunchModal) {
            closeGameModal();
        }
    });
}

// Filter Games
function filterGames() {
    const searchTerm = gameSearch.value.toLowerCase();
    const filteredGames = games.filter(game =>
        game.name.toLowerCase().includes(searchTerm) ||
        game.description.toLowerCase().includes(searchTerm)
    );
    displayGames(filteredGames);
}

// Filter Game History
function filterGameHistory() {
    const period = historyPeriod.value;
    let filteredHistory = [...gameHistory];

    if (period !== 'all') {
        const now = new Date();
        let cutoffDate;

        switch (period) {
            case 'today':
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        filteredHistory = gameHistory.filter(session =>
            new Date(session.session_start) >= cutoffDate
        );
    }

    displayGameHistory(filteredHistory);
}

// Balance Management
function updateBalanceDisplay(balance) {
    const formattedBalance = parseFloat(balance).toFixed(2);
    headerBalance.textContent = formattedBalance;
    totalBalance.textContent = formattedBalance;
    currentBalance.textContent = formattedBalance;
}

async function refreshBalance() {
    try {
        const response = await apiCall('/users/balance');
        updateBalanceDisplay(response.data.balance);
        currentUser.balance = response.data.balance;
        showNotification('Balance refreshed', 'success');
    } catch (error) {
        console.error('Failed to refresh balance:', error);
        showNotification('Failed to refresh balance', 'error');
    }
}

// Modal Functions
function openAddBalanceModal() {
    addBalanceModal.style.display = 'block';
    document.getElementById('balanceAmount').focus();
}

function closeAddBalanceModal() {
    addBalanceModal.style.display = 'none';
    addBalanceForm.reset();
}

async function handleAddBalance(event) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('balanceAmount').value);

    if (amount < 1 || amount > 10000) {
        showNotification('Amount must be between $1 and $10,000', 'error');
        return;
    }

    try {
        const response = await apiCall('/users/add-balance', {
            method: 'POST',
            body: { amount }
        });

        updateBalanceDisplay(response.data.new_balance);
        currentUser.balance = response.data.new_balance;
        closeAddBalanceModal();
        showNotification(response.message, 'success');

        // Refresh transactions
        await loadRecentTransactions();

    } catch (error) {
        console.error('Failed to add balance:', error);
        showNotification('Failed to add balance: ' + error.message, 'error');
    }
}

function openGameModal(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    currentGameData = game;

    // Update modal content
    document.getElementById('gameModalTitle').textContent = `Launch ${game.name}`;
    document.getElementById('gameModalName').textContent = game.name;
    document.getElementById('gameModalDescription').textContent = game.description;
    document.getElementById('gameModalMinBet').textContent = game.min_bet.toFixed(2);
    document.getElementById('gameModalMaxBet').textContent = game.max_bet.toFixed(2);

    const gameImage = document.getElementById('gameModalImage');
    gameImage.src = game.image_path;
    gameImage.alt = game.name;
    gameImage.onerror = function() {
        this.src = `https://via.placeholder.com/120x120/1a1a2e/FFD700?text=${encodeURIComponent(game.name)}`;
    };

    gameLaunchModal.style.display = 'block';
}

function closeGameModal() {
    gameLaunchModal.style.display = 'none';
    currentGameData = null;
}

function launchGame() {
    if (!currentGameData) return;

    // Check if user has sufficient balance
    if (currentUser.balance < currentGameData.min_bet) {
        showNotification('Insufficient balance. Please add funds to play this game.', 'error');
        closeGameModal();
        openAddBalanceModal();
        return;
    }

    // Launch game in new window
    const gameWindow = window.open(currentGameData.game_url, '_blank', 'noopener,noreferrer');

    if (gameWindow) {
        showNotification(`Launching ${currentGameData.name}...`, 'success');

        // Log game launch (could be enhanced to create a game session)
        logGameLaunch(currentGameData.id);

        closeGameModal();
    } else {
        showNotification('Please allow pop-ups to launch games', 'error');
    }
}

async function logGameLaunch(gameId) {
    try {
        // This could be enhanced to create a game session in the backend
        console.log(`Game launched: ${gameId}`);
    } catch (error) {
        console.error('Failed to log game launch:', error);
    }
}

// Refresh Functions
async function refreshGames() {
    try {
        dashboardGamesGrid.innerHTML = `
            <div class="loading-games">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading games...</p>
            </div>`;
        await loadGames();
        showNotification('Games refreshed', 'success');
    } catch (error) {
        showNotification('Failed to refresh games', 'error');
    }
}

// Utility Functions
function calculateDuration(startTime, endTime) {
    const diff = endTime - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function formatDateTime(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTransactionIcon(type) {
    const icons = {
        'deposit': 'plus',
        'withdrawal': 'minus',
        'bet': 'dice',
        'win': 'trophy',
        'bonus': 'gift'
    };
    return icons[type] || 'exchange-alt';
}

// Logout Function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuthToken();
        showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Notification Function (assuming it exists in script.js)
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(notification);
    }

    // Set notification style based on type
    const colors = {
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FF9800',
        info: '#2196F3'
    };

    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';

    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
    }, 3000);
}

// Open Transactions Modal (placeholder)
function openTransactionsModal() {
    showNotification('Transactions modal coming soon!', 'info');
}