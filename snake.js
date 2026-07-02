const LEADERBOARD_KEY = 'portfolioSnakeLeaderboard';
const BOMB_LIFETIME_MS = 10000;
const BOMB_SPAWN_INTERVAL_MS = 4500;

function getLeaderboard() {
    try {
        return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    } catch {
        return [];
    }
}

function saveToLeaderboard(name, score, timeSeconds) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const board = getLeaderboard();
    const existingIndex = board.findIndex(
        (entry) => entry.name.toLowerCase() === trimmedName.toLowerCase()
    );
    const newEntry = {
        name: trimmedName,
        score,
        time: timeSeconds,
        date: Date.now(),
    };

    if (existingIndex !== -1) {
        const existing = board[existingIndex];
        const isBetter =
            score > existing.score ||
            (score === existing.score && timeSeconds > existing.time);
        if (isBetter) {
            board[existingIndex] = newEntry;
        }
    } else {
        board.push(newEntry);
    }

    board.sort((a, b) => b.score - a.score || b.time - a.time);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderLeaderboard(listEl) {
    const board = getLeaderboard();
    listEl.innerHTML = '';

    if (board.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'No scores yet';
        listEl.appendChild(empty);
        return;
    }

    board.forEach((entry, index) => {
        const item = document.createElement('li');
        item.textContent = `${index + 1}. ${entry.name}, ${entry.score} pts (${formatTime(entry.time)})`;
        listEl.appendChild(item);
    });
}

function initSecretEasterEgg() {
    const popup = document.getElementById('secret-popup');
    const closeBtn = popup.querySelector('.secret-popup-close');
    const continueBtn = popup.querySelector('.secret-popup-continue');
    const retryBtn = popup.querySelector('.secret-popup-retry');
    const exitBtn = popup.querySelector('.secret-popup-exit');
    const messageEl = popup.querySelector('.secret-popup-message');
    const nameInput = document.getElementById('secret-name-input');
    const deathScoreEl = popup.querySelector('.secret-death-score');
    const finalScoreEl = document.getElementById('secret-final-score');
    const leaderboardEl = document.getElementById('secret-leaderboard');
    const leaderboardList = document.getElementById('secret-leaderboard-list');
    const canvas = document.getElementById('snake-game-canvas');
    const hud = document.getElementById('snake-game-hud');
    const scoreEl = document.getElementById('snake-score');
    const badgesContainer = document.querySelector('.skills-badges-container');
    const secretBadges = document.querySelectorAll('.secret-badge');

    let snakeGame = null;
    let popupMode = 'intro';
    let playerName = '';

    function showPopup(mode, stats = null) {
        popupMode = mode;
        badgesContainer.classList.add('paused');
        popup.classList.remove('hidden');
        popup.setAttribute('aria-hidden', 'false');

        if (mode === 'intro') {
            messageEl.textContent = '🐍 You discovered the secret snake game. Let’s see how long you survive.';
            nameInput.classList.remove('hidden');
            deathScoreEl.classList.add('hidden');
            leaderboardEl.classList.add('hidden');
            continueBtn.classList.remove('hidden');
            retryBtn.classList.add('hidden');
            exitBtn.classList.add('hidden');
        } else {
            messageEl.textContent = '🐍 Oops. Your adventure ended pretty quick, want to try again?';   
            nameInput.classList.add('hidden');
            deathScoreEl.classList.remove('hidden');
            leaderboardEl.classList.remove('hidden');
            continueBtn.classList.add('hidden');
            retryBtn.classList.remove('hidden');
            exitBtn.classList.remove('hidden');

            if (stats) {
                finalScoreEl.textContent = stats.score;
                saveToLeaderboard(playerName, stats.score, stats.time);
            }

            renderLeaderboard(leaderboardList);
        }
    }

    function hidePopup() {
        popup.classList.add('hidden');
        popup.setAttribute('aria-hidden', 'true');
        badgesContainer.classList.remove('paused');
    }

    function hideHud() {
        hud.classList.add('hidden');
        hud.setAttribute('aria-hidden', 'true');
    }

    function showHud() {
        hud.classList.remove('hidden');
        hud.setAttribute('aria-hidden', 'false');
    }

    function exitToSite() {
        hidePopup();
        hideHud();
        if (snakeGame) {
            snakeGame.stop();
            snakeGame = null;
        }
    }

    function startGame() {
        playerName = nameInput.value.trim();

        if (snakeGame) {
            snakeGame.stop();
        }

        snakeGame = new SnakeGame({
            canvas,
            scoreEl,
            onDeath: (stats) => {
                snakeGame = null;
                hideHud();
                showPopup('death', stats);
            },
            onStop: () => {
                snakeGame = null;
                hideHud();
            },
        });
        snakeGame.start();
        showHud();
    }

    secretBadges.forEach((badge) => {
        badge.addEventListener('click', (event) => {
            event.stopPropagation();
            if (snakeGame) {
                snakeGame.stop();
                snakeGame = null;
            }
            hideHud();
            showPopup('intro');
        });
    });

    closeBtn.addEventListener('click', () => {
        if (popupMode === 'intro') {
            hidePopup();
        } else {
            exitToSite();
        }
    });

    continueBtn.addEventListener('click', () => {
        hidePopup();
        startGame();
    });

    retryBtn.addEventListener('click', () => {
        hidePopup();
        startGame();
    });

    exitBtn.addEventListener('click', () => {
        exitToSite();
    });

    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            if (popupMode === 'intro') {
                hidePopup();
            } else {
                exitToSite();
            }
        }
    });
}

class SnakeGame {
    constructor({ canvas, scoreEl, onDeath, onStop }) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.onDeath = onDeath;
        this.onStop = onStop;
        this.cellSize = 18;
        this.baseSpeed = 130;
        this.speed = this.baseSpeed;
        this.running = false;
        this.loopId = null;
        this.bombSpawnIntervalId = null;
        this.cols = 0;
        this.rows = 0;
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.snake = [];
        this.items = [];
        this.score = 0;
        this.startTime = 0;
        this.fruitTypes = [
            { color: '#e74c3c', accent: '#2ecc71' },
            { color: '#f39c12', accent: '#d35400' },
            { color: '#9b59b6', accent: '#8e44ad' },
            { color: '#f1c40f', accent: '#27ae60' },
            { color: '#3498db', accent: '#2980b9' },
            { color: '#e84393', accent: '#fd79a8' },
        ];
        this.keyHandler = this.handleKeyDown.bind(this);
        this.touchStartHandler = this.handleTouchStart.bind(this);
        this.touchMoveHandler = this.handleTouchMove.bind(this);
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    start() {
        this.speed = this.baseSpeed;
        this.score = 0;
        this.resize();
        this.snake = [
            { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) },
            { x: Math.floor(this.cols / 2) - 1, y: Math.floor(this.rows / 2) },
            { x: Math.floor(this.cols / 2) - 2, y: Math.floor(this.rows / 2) },
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.items = [];
        this.spawnFruits(12);
        this.startTime = Date.now();
        this.running = true;
        this.updateHud();
        this.canvas.classList.remove('hidden');
        this.canvas.setAttribute('aria-hidden', 'false');
        window.addEventListener('resize', this.resizeHandler = () => this.resize());
        window.addEventListener('keydown', this.keyHandler);
        this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
        this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
        this.bombSpawnIntervalId = setInterval(() => {
            if (this.running) {
                this.spawnBomb();
            }
        }, BOMB_SPAWN_INTERVAL_MS);
        this.tick();
    }

    clearBombInterval() {
        if (this.bombSpawnIntervalId) {
            clearInterval(this.bombSpawnIntervalId);
            this.bombSpawnIntervalId = null;
        }
    }

    stop() {
        this.running = false;
        if (this.loopId) {
            clearTimeout(this.loopId);
            this.loopId = null;
        }
        this.clearBombInterval();
        window.removeEventListener('keydown', this.keyHandler);
        this.canvas.removeEventListener('touchstart', this.touchStartHandler);
        this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.canvas.classList.add('hidden');
        this.canvas.setAttribute('aria-hidden', 'true');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    die() {
        this.running = false;
        if (this.loopId) {
            clearTimeout(this.loopId);
            this.loopId = null;
        }
        this.clearBombInterval();
        window.removeEventListener('keydown', this.keyHandler);
        this.canvas.removeEventListener('touchstart', this.touchStartHandler);
        this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.canvas.classList.add('hidden');
        this.canvas.setAttribute('aria-hidden', 'true');

        const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);

        if (this.onDeath) {
            this.onDeath({
                score: this.score,
                time: elapsedSeconds,
            });
        }
    }

    updateHud() {
        this.scoreEl.textContent = this.score;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
    }

    handleKeyDown(event) {
        if (!this.running) return;

        const keyMap = {
            arrowup: { x: 0, y: -1 },
            arrowdown: { x: 0, y: 1 },
            arrowleft: { x: -1, y: 0 },
            arrowright: { x: 1, y: 0 },
            w: { x: 0, y: -1 },
            s: { x: 0, y: 1 },
            a: { x: -1, y: 0 },
            d: { x: 1, y: 0 },
        };

        if (event.key === 'Escape') {
            this.stop();
            if (this.onStop) {
                this.onStop();
            }
            return;
        }

        const newDir = keyMap[event.key.toLowerCase()];
        if (!newDir) return;

        event.preventDefault();

        const isReverse =
            newDir.x === -this.direction.x && newDir.y === -this.direction.y;
        if (!isReverse) {
            this.nextDirection = newDir;
        }
    }

    handleTouchStart(event) {
        if (!this.running) return;
        event.preventDefault(); // Prevent scrolling
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
    }

    handleTouchMove(event) {
        if (!this.running) return;
        event.preventDefault(); // Prevent scrolling

        if (!this.touchStartX || !this.touchStartY) {
            return;
        }

        let touchEndX = event.touches[0].clientX;
        let touchEndY = event.touches[0].clientY;

        let dx = touchEndX - this.touchStartX;
        let dy = touchEndY - this.touchStartY;

        // Require a minimum swipe distance to avoid accidental tiny movements
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
            return;
        }

        let newDir = null;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0) {
                newDir = { x: 1, y: 0 }; // Right
            } else {
                newDir = { x: -1, y: 0 }; // Left
            }
        } else {
            // Vertical swipe
            if (dy > 0) {
                newDir = { x: 0, y: 1 }; // Down
            } else {
                newDir = { x: 0, y: -1 }; // Up
            }
        }

        if (newDir) {
            const isReverse = newDir.x === -this.direction.x && newDir.y === -this.direction.y;
            if (!isReverse) {
                this.nextDirection = newDir;
            }
        }

        // Reset touch start to prevent continuous triggering in one swipe
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    spawnFruits(count) {
        for (let i = 0; i < count; i++) {
            this.spawnFruit();
        }
    }

    spawnFruit() {
        const position = this.getRandomPosition('fruit');
        if (position) {
            this.items.push(position);
        }
    }

    spawnBomb() {
        const position = this.getRandomPosition('bomb');
        if (position) {
            this.items.push(position);
        }
    }

    getRandomPosition(kind) {
        let position;
        let attempts = 0;

        do {
            position = {
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows),
                kind,
                type: Math.floor(Math.random() * this.fruitTypes.length),
                spawnedAt: Date.now(),
            };
            attempts++;
        } while (this.isOccupied(position) && attempts < 200);

        if (!this.isOccupied(position)) {
            return position;
        }

        return null;
    }

    isOccupied(pos) {
        return (
            this.snake.some((segment) => segment.x === pos.x && segment.y === pos.y) ||
            this.items.some((item) => item.x === pos.x && item.y === pos.y)
        );
    }

    expireBombs() {
        const now = Date.now();

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.kind === 'bomb' && now - item.spawnedAt >= BOMB_LIFETIME_MS) {
                this.items.splice(i, 1);
                this.score += 1;
                this.scoreEl.textContent = this.score;
            }
        }
    }

    tick() {
        if (!this.running) return;

        this.expireBombs();

        this.direction = this.nextDirection;
        const head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y,
        };

        if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
            this.die();
            return;
        }

        const eatenIndex = this.items.findIndex(
            (item) => item.x === head.x && item.y === head.y
        );

        if (eatenIndex !== -1 && this.items[eatenIndex].kind === 'bomb') {
            this.die();
            return;
        }

        this.snake.unshift(head);

        if (eatenIndex !== -1) {
            this.items.splice(eatenIndex, 1);
            this.score += 1;
            this.scoreEl.textContent = this.score;
            this.spawnFruit();
            this.speed = Math.max(75, this.speed - 2);
        } else {
            this.snake.pop();
        }

        this.draw();
        this.loopId = setTimeout(() => this.tick(), this.speed);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.items.forEach((item) => {
            const x = item.x * this.cellSize;
            const y = item.y * this.cellSize;
            const centerX = x + this.cellSize / 2;
            const centerY = y + this.cellSize / 2;

            if (item.kind === 'bomb') {
                const radius = this.cellSize * 0.55;
                this.ctx.fillStyle = '#2c2c2c';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#ff4757';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - radius * 0.5, centerY - radius * 0.5);
                this.ctx.lineTo(centerX + radius * 0.5, centerY + radius * 0.5);
                this.ctx.moveTo(centerX + radius * 0.5, centerY - radius * 0.5);
                this.ctx.lineTo(centerX - radius * 0.5, centerY + radius * 0.5);
                this.ctx.stroke();

                this.ctx.fillStyle = '#ffa502';
                this.ctx.fillRect(centerX - 1, y - 4, 3, 5);
            } else {
                const type = this.fruitTypes[item.type];
                const radius = this.cellSize * 0.55;

                this.ctx.fillStyle = type.color;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = type.accent;
                this.ctx.fillRect(centerX - 2, y - 3, 4, 6);
            }
        });

        this.snake.forEach((segment, index) => {
            const x = segment.x * this.cellSize;
            const y = segment.y * this.cellSize;
            const padding = index === 0 ? 1 : 2;
            const size = this.cellSize - padding * 2;

            this.ctx.fillStyle = index === 0 ? '#27ae60' : '#2ecc71';
            this.ctx.fillRect(x + padding, y + padding, size, size);

            if (index === 0) {
                this.ctx.fillStyle = '#1a1a1a';
                const eyeSize = 3;
                const eyeOffset = 5;
                if (this.direction.x === 1) {
                    this.ctx.fillRect(x + this.cellSize - eyeOffset - eyeSize, y + 4, eyeSize, eyeSize);
                    this.ctx.fillRect(x + this.cellSize - eyeOffset - eyeSize, y + this.cellSize - 7, eyeSize, eyeSize);
                } else if (this.direction.x === -1) {
                    this.ctx.fillRect(x + eyeOffset, y + 4, eyeSize, eyeSize);
                    this.ctx.fillRect(x + eyeOffset, y + this.cellSize - 7, eyeSize, eyeSize);
                } else if (this.direction.y === -1) {
                    this.ctx.fillRect(x + 4, y + eyeOffset, eyeSize, eyeSize);
                    this.ctx.fillRect(x + this.cellSize - 7, y + eyeOffset, eyeSize, eyeSize);
                } else {
                    this.ctx.fillRect(x + 4, y + this.cellSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                    this.ctx.fillRect(x + this.cellSize - 7, y + this.cellSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSecretEasterEgg();
});
