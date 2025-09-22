// API Configuration
const API_BASE_URL = 'http://localhost:3005/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let games = [];

// DOM elements
const fortuneWheel = document.getElementById('fortuneWheel');
const gamesGrid = document.getElementById('gamesGrid');

// API Helper Functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication Functions
function setAuthToken(token) {
    authToken = token;
    localStorage.setItem('authToken', token);
}

function clearAuthToken() {
    authToken = null;
    localStorage.removeItem('authToken');
    currentUser = null;
}

// Fortune wheel functionality
let isSpinning = false;

async function spinWheel() {
    if (isSpinning) return;

    isSpinning = true;
    const spinAngle = Math.random() * 360 + 1440; // At least 4 full rotations

    fortuneWheel.style.transform = `rotate(${spinAngle}deg)`;

    try {
        // Call backend API for wheel spin
        const response = await apiCall('/wheel/spin', { method: 'POST' });

        setTimeout(() => {
            showResult(response.data);
            isSpinning = false;
        }, 3000);
    } catch (error) {
        setTimeout(() => {
            showResult({ result: 'error', message: 'Spin failed. Please try again.' });
            isSpinning = false;
        }, 3000);
    }
}

function showResult(resultData) {
    const modal = document.createElement('div');
    modal.className = 'result-modal';

    let resultDisplay = resultData.result || 'error';
    let message = resultData.message || '';
    let resultColor = '#ff6b6b'; // default red

    if (resultData.prize_amount > 0) {
        resultColor = '#4ecdc4';
        resultDisplay = `$${resultData.prize_amount}`;
    } else if (resultData.result === 'win') {
        resultColor = '#4ecdc4';
    }

    modal.innerHTML = `
        <div class="modal-content">
            <h3>Spin Result</h3>
            <div class="result-value" style="color: ${resultColor}">${resultDisplay}</div>
            <p class="result-message">${message}</p>
            ${currentUser ? `<p class="balance-info">Your Balance: $${currentUser.balance}</p>` : ''}
            <button class="close-btn" data-action="close-modal">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .result-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        .modal-content {
            background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            border: 2px solid #ffd700;
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
        }
        .modal-content h3 {
            color: #ffd700;
            font-size: 1.5rem;
            margin-bottom: 20px;
        }
        .result-value {
            font-size: 3rem;
            font-weight: bold;
            color: ${typeof resultDisplay === 'number' ? '#4ecdc4' : resultDisplay === 'win' ? '#4ecdc4' : '#ff6b6b'};
            margin-bottom: 30px;
        }
        .close-btn {
            padding: 10px 30px;
            background: #ffd700;
            border: none;
            border-radius: 25px;
            color: #000;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        .close-btn:hover {
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);
}

function closeModal() {
    const modal = document.querySelector('.result-modal');
    if (modal) {
        modal.remove();
    }
}

// Load games from API
async function loadGames() {
    try {
        const response = await apiCall('/games');
        games = response.data;
        renderGames();
    } catch (error) {
        console.error('Error loading games:', error);
        gamesGrid.innerHTML = '<p style="color: #ff6b6b; text-align: center;">Error loading games. Please refresh the page.</p>';
    }
}

// Games grid functionality
function renderGames() {
    gamesGrid.innerHTML = '';

    if (games.length === 0) {
        gamesGrid.innerHTML = '<p style="color: #ccc; text-align: center;">Loading games...</p>';
        return;
    }

    games.forEach(game => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.innerHTML = `
            <img src="${game.image_path}" alt="${game.name}" class="game-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDI4MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZmZkNzAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkdhbWUgSW1hZ2U8L3RleHQ+Cjwvc3ZnPg=='"'>
            <div class="game-info">
                <h3 class="game-title">${game.name}</h3>
                <p class="game-description">${game.description}</p>
            </div>
        `;

        gameCard.addEventListener('click', () => {
            showGameModal(game);
        });

        gamesGrid.appendChild(gameCard);
    });
}

function showGameModal(game) {
    const modal = document.createElement('div');
    modal.className = 'game-modal';
    modal.innerHTML = `
        <div class="game-modal-content">
            <span class="close-game-modal">&times;</span>
            <img src="${game.image_path}" alt="${game.name}" class="modal-game-image">
            <h2>${game.name}</h2>
            <p>${game.description}</p>
            <div class="modal-buttons">
                <button class="play-game-btn">Play Now</button>
                <button class="demo-game-btn">Demo</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add game modal styles
    if (!document.querySelector('#game-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'game-modal-styles';
        style.textContent = `
            .game-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
            }
            .game-modal-content {
                background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                padding: 40px;
                border-radius: 15px;
                text-align: center;
                border: 2px solid #ffd700;
                box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
                max-width: 500px;
                position: relative;
            }
            .close-game-modal {
                position: absolute;
                top: 15px;
                right: 20px;
                font-size: 2rem;
                color: #ffd700;
                cursor: pointer;
                transition: color 0.3s ease;
            }
            .close-game-modal:hover {
                color: #fff;
            }
            .modal-game-image {
                width: 150px;
                height: 150px;
                object-fit: cover;
                border-radius: 10px;
                margin-bottom: 20px;
                border: 2px solid #ffd700;
            }
            .game-modal-content h2 {
                color: #ffd700;
                font-size: 1.8rem;
                margin-bottom: 15px;
                font-family: 'Orbitron', sans-serif;
            }
            .game-modal-content p {
                color: #ccc;
                margin-bottom: 30px;
                font-size: 1.1rem;
            }
            .modal-buttons {
                display: flex;
                gap: 20px;
                justify-content: center;
            }
            .play-game-btn, .demo-game-btn {
                padding: 12px 30px;
                border: none;
                border-radius: 25px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1rem;
            }
            .play-game-btn {
                background: linear-gradient(45deg, #ffd700, #ffed4e);
                color: #000;
            }
            .demo-game-btn {
                background: transparent;
                border: 2px solid #ffd700;
                color: #ffd700;
            }
            .play-game-btn:hover, .demo-game-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    // Close modal functionality
    modal.querySelector('.close-game-modal').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Game action buttons
    modal.querySelector('.play-game-btn').addEventListener('click', async () => {
        try {
            // Track game play and get the game URL
            const response = await apiCall(`/games/${game.id}/play`, { method: 'POST' });

            // Open game in new window/tab
            window.open(response.data.game_url, '_blank');
            modal.remove();
        } catch (error) {
            alert(`Error launching ${game.name}: ${error.message}`);
        }
    });

    modal.querySelector('.demo-game-btn').addEventListener('click', async () => {
        try {
            // For demo, just open the game URL without tracking
            window.open(game.game_url, '_blank');
            modal.remove();
        } catch (error) {
            alert(`Error starting demo for ${game.name}: ${error.message}`);
        }
    });
}

// No tab functionality needed - only one tab now

// Smooth scrolling for navigation
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Authentication UI functions
function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const dashboardLink = document.getElementById('dashboardLink');
    const userBalance = document.getElementById('userBalance');

    if (currentUser) {
        authButtons.innerHTML = `
            <span class="user-info">Welcome, ${currentUser.username} | Balance: $${currentUser.balance}</span>
            <button class="logout-btn" data-action="logout">Logout</button>
        `;

        // Show dashboard link and user balance
        if (dashboardLink) dashboardLink.style.display = 'block';
        if (userBalance) {
            userBalance.style.display = 'flex';
            const balanceAmount = document.getElementById('balanceAmount');
            if (balanceAmount) balanceAmount.textContent = parseFloat(currentUser.balance).toFixed(2);
        }
    } else {
        authButtons.innerHTML = `
            <button class="login-btn" data-action="show-login">Login</button>
        `;

        // Hide dashboard link and user balance
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (userBalance) userBalance.style.display = 'none';
    }
}

function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-content">
            <span class="close-auth-modal">&times;</span>
            <h2>Login</h2>
            <form id="loginForm">
                <input type="email" id="loginEmail" placeholder="Email" required>
                <input type="password" id="loginPassword" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
            <p>For account registration, please contact the administrator.</p>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close-auth-modal').onclick = closeAuthModal;
    modal.onclick = (e) => e.target === modal && closeAuthModal();

    // Login form handler
    document.getElementById('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await apiCall('/auth/login', {
                method: 'POST',
                body: { email, password }
            });

            setAuthToken(response.data.token);
            currentUser = response.data.user;
            updateAuthUI();
            closeAuthModal();
            alert('Login successful!');
        } catch (error) {
            alert(`Login failed: ${error.message}`);
        }
    };
}


function closeAuthModal() {
    const modal = document.querySelector('.auth-modal');
    if (modal) modal.remove();
}

async function logout() {
    try {
        if (authToken) {
            await apiCall('/auth/logout', { method: 'POST' });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearAuthToken();
        updateAuthUI();
        alert('Logged out successfully!');
    }
}

// Load recent winners for ticker
async function loadRecentWinners() {
    try {
        const response = await apiCall('/wheel/recent-winners?limit=3');
        const winnersContainer = document.querySelector('#winnersTicker');

        if (response.data && response.data.length > 0) {
            // Show actual winners if available
            const winnersHTML = response.data.map(winner => `
                <div class="winner-item">
                    <div class="winner-avatar">🎭</div>
                    <div class="winner-info">
                        <div class="winner-name">${winner.name}</div>
                        <div class="winner-game">Fortune Wheel</div>
                    </div>
                    <div class="winner-amount">$${winner.amount}</div>
                </div>
            `).join('');
            winnersContainer.innerHTML = winnersHTML;
        } else {
            // Default content
            winnersContainer.innerHTML = `
                <div class="winner-item">
                    <div class="winner-avatar">🎭</div>
                    <div class="winner-info">
                        <div class="winner-name">Player***123</div>
                        <div class="winner-game">Fortune Wheel</div>
                    </div>
                    <div class="winner-amount">$1,250.00</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent winners:', error);
        // Fallback content
        const winnersContainer = document.querySelector('#winnersTicker');
        if (winnersContainer) {
            winnersContainer.innerHTML = `
                <div class="winner-item">
                    <div class="winner-avatar">🎭</div>
                    <div class="winner-info">
                        <div class="winner-name">Player***123</div>
                        <div class="winner-game">Fortune Wheel</div>
                    </div>
                    <div class="winner-amount">$1,250.00</div>
                </div>
            `;
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Event listeners
    fortuneWheel.addEventListener('click', spinWheel);

    // Check if user is already logged in
    if (authToken) {
        try {
            const response = await apiCall('/auth/profile');
            currentUser = response.data;
        } catch (error) {
            clearAuthToken();
        }
    }

    // Initialize functions
    updateAuthUI();
    await loadGames();
    await loadRecentWinners();
    initSmoothScrolling();

    // Refresh recent winners every 30 seconds
    setInterval(loadRecentWinners, 30000);

    // Add parallax effect to hero section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-main');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
});

// Event delegation for data-action attributes
document.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    if (action) {
        e.preventDefault();
        switch (action) {
            case 'close-modal':
                closeModal();
                break;
            case 'logout':
                logout();
                break;
            case 'show-login':
                showLoginModal();
                break;
        }
    }
});

// Add window click listener for closing modals
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('result-modal')) {
        closeModal();
    }
});