class ICENAKE {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.cols = 20;
        this.rows = 37; // 2 строки добавлено
        this.setResponsiveField();
        this.initVars();
        this.initUI();
        this.initControls();
        this.popupTimeout = null;
        requestAnimationFrame(this.loop.bind(this));
    }

    setResponsiveField() {
        const w = window.innerWidth;
        const h = window.innerHeight - 30;
        let maxW = Math.min(420, w - 16);
        let maxH = Math.floor(maxW * (this.rows / this.cols));
        if (maxH > h - 160) {
            maxH = h - 160;
            maxW = Math.floor(maxH * (this.cols / this.rows));
        }
        this.canvas.width = this.cols * this.gridSize;
        this.canvas.height = this.rows * this.gridSize;

        // --- Сдвиг поля вниз на 4 строки (4*20=80px) ---
        this.canvas.style.display = "block";
        this.canvas.style.marginTop = (4 * this.gridSize) + "px";
        this.canvas.style.marginBottom = "0";
        this.canvas.style.width = maxW + "px";
        this.canvas.style.height = maxH + "px";
    }

    initVars() {
        this.snake = [];
        this.foods = [];
        this.specials = [];
        this.effects = {};
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.baseSpeed = 5.0;
        this.speed = this.baseSpeed;
        this.lastFrame = 0;
        this.highScore = parseInt(localStorage.getItem("icenake-highscore") || "0");
        this.musicEnabled = false;
        this.gameState = "menu";
        this.effectTimers = {};
        this.activeEffect = null;
        this.specialTypes = [
            { type: "double", label: "DOUBLE CUP", color: "#ae5eff" },
            { type: "invulnerable", label: "GOD MODE", color: "#ff7ca6" },
            { type: "disco", label: "TRAP MODE", color: "#f35bb4" },
            { type: "chill", label: "CHILLIN", color: "#7e9cff" },
            { type: "treasure", label: "BANKROLL", color: "#f7ff54" },
            { type: "savage", label: "SAVAGE MODE", color: "#54c2ff" },
            { type: "multifood", label: "FASTFOOD", color: "#31e8ed" }
        ];
        this.maxScore = this.cols * this.rows * 10;
    }

    initUI() {
        document.getElementById("startBtn").onclick = () => this.startGame();
        document.getElementById("pauseBtn").onclick = () => this.pause();
        document.getElementById("resumeBtn").onclick = () => this.resume();
        document.getElementById("restartBtn").onclick = () => this.startGame();
        document.getElementById("backToMenuBtn").onclick = () => this.menu();
        document.getElementById("playAgainBtn").onclick = () => this.startGame();
        document.getElementById("mainMenuBtn").onclick = () => this.menu();
        document.getElementById("highScoreBtn").onclick = () => this.showLeaderboard();
        document.getElementById("backFromScores").onclick = () => this.menu();
        document.getElementById("musicBtn").onclick = () => {
            this.musicEnabled = !this.musicEnabled;
            document.getElementById("musicBtn").textContent = `MUSIC: ${this.musicEnabled ? "ON" : "OFF"}`;
            const music = document.getElementById("musicLoop");
            if (this.musicEnabled) { music.volume = 0.22; music.play(); }
            else { music.pause(); music.currentTime = 0; }
        };
        this.popup = document.createElement('div');
        this.popup.className = 'effect-popup';
        document.body.appendChild(this.popup);
    }

    initControls() {
        document.addEventListener("keydown", e => {
            if (this.gameState === "playing") {
                if (e.key === "ArrowUp" && this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
                if (e.key === "ArrowDown" && this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
                if (e.key === "ArrowLeft" && this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
                if (e.key === "ArrowRight" && this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
                if (e.key === " " || e.code === "Space") this.pause();
            }
        });
        let touchStartX, touchStartY;
        this.canvas.addEventListener("touchstart", e => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        });
        this.canvas.addEventListener("touchend", e => {
            if (e.changedTouches.length === 1) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                const threshold = 16;
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > threshold && this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
                    if (dx < -threshold && this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
                } else {
                    if (dy > threshold && this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
                    if (dy < -threshold && this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
                }
            }
        });
        document.body.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
    }

    startGame() {
        this.setResponsiveField();
        this.initVars();
        this.snake = [{ x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) }];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.addFood();
        this.hideAll();
        document.getElementById("gameScreen").classList.remove("hidden");
        this.gameState = "playing";
        this.updateUI();
    }

    hideAll() {
        document.querySelectorAll(".screen").forEach(e => e.classList.add("hidden"));
        this.hidePopup();
    }

        menu() {
        this.hideAll();
        document.getElementById("startMenu").classList.remove("hidden");
        const music = document.getElementById("musicLoop");
        if (music) { music.pause(); music.currentTime = 0; }
        this.gameState = "menu";
    }

    pause() {
        if (this.gameState === "playing") {
            this.gameState = "paused";
            document.getElementById("pauseMenu").classList.remove("hidden");
        }
    }

    resume() {
        if (this.gameState === "paused") {
            this.gameState = "playing";
            document.getElementById("pauseMenu").classList.add("hidden");
        }
    }

    showLeaderboard() {
        const names = [
            "ELON MUSK", "K.JENNER", "A$AP ROCKY",
            "CARDI B", "PONTYNEKOLOTI", "MRBEAST",
            "PDIDDY", "PAVEL DUROV", "JORDAN", "YOU"
        ];
        let results = [];
        let base = this.cols * this.rows * 10;
        let step = Math.floor(base / (names.length + 1) / 10) * 10;
        for (let i = 0; i < names.length - 1; i++) {
            let score = base - step * i;
            score = Math.floor(score / 10) * 10;
            results.push(score);
        }
        results.push(Math.floor(this.highScore / 10) * 10);
        let html = '';
        for (let i = 0; i < names.length; i++) {
            html += `<div class="score-item"><span>${i + 1}. ${names[i]}</span><span>${results[i]}</span></div>`;
        }
        document.getElementById("leaderboard").innerHTML = html;
        this.hideAll();
        document.getElementById("highScoreScreen").classList.remove("hidden");
    }

    loop(timestamp) {
        requestAnimationFrame(this.loop.bind(this));
        if (this.gameState !== "playing") return;
        if (!this.lastFrame || timestamp - this.lastFrame > 1000 / this.speed) {
            this.update();
            this.draw();
            this.lastFrame = timestamp;
        }
    }

    update() {
        this.direction = this.nextDirection;
        const head = {
            x: (this.snake[0].x + this.direction.x + this.cols) % this.cols,
            y: (this.snake[0].y + this.direction.y + this.rows) % this.rows
        };
        if (!this.effects.savage && this.snake.some(s => s.x === head.x && s.y === head.y)) {
            return this.gameOver();
        }
        this.snake.unshift(head);

        let ateFood = false;
        for (let i = 0; i < this.foods.length; i++) {
            if (head.x === this.foods[i].x && head.y === this.foods[i].y) {
                ateFood = true;
                this.foods.splice(i, 1);
                this.playSound("eatSound");
                break;
            }
        }
        for (let i = 0; i < this.specials.length; i++) {
            if (head.x === this.specials[i].x && head.y === this.specials[i].y) {
                this.activateSpecial(this.specials[i].type);
                this.showPopup(this.specials[i].label, this.specials[i].color, 1500);
                this.specials.splice(i, 1);
                this.playSound("eatSound");
                break;
            }
        }
        if (ateFood) {
            this.score += (this.effects.double ? 20 : 10);
            if (this.effects.chill) {
                this.speed = this.baseSpeed * 0.66;
            } else {
                this.speed = this.baseSpeed + this.snake.length * 0.07;
            }
            if (this.score >= this.maxScore) return this.gameOver(true);
            if (Math.random() < 0.2) this.addSpecial();
            this.addFood();
        } else {
            this.snake.pop();
        }
        this.updateUI();
    }

    playSound(id) {
    if (id === "eatSound") return; // Просто игнорируем этот звук
    try {
        const audio = document.getElementById(id);
        if (audio) { audio.currentTime = 0; audio.play(); }
    } catch { }
}

    addFood(count = 1) {
        while (count--) {
            let pos;
            do {
                pos = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) };
            } while (
                this.snake.some(s => s.x === pos.x && s.y === pos.y) ||
                this.foods.some(f => f.x === pos.x && f.y === pos.y)
            );
            this.foods.push(pos);
        }
    }

    addSpecial() {
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) };
        } while (
            this.snake.some(s => s.x === pos.x && s.y === pos.y) ||
            this.foods.some(f => f.x === pos.x && f.y === pos.y)
        );
        const pick = this.specialTypes[Math.floor(Math.random() * this.specialTypes.length)];
        this.specials.push({ ...pos, ...pick });
    }

    activateSpecial(type) {
        if (this.effectTimers[type]) clearTimeout(this.effectTimers[type]);
        if (["double", "savage", "disco", "chill"].includes(type)) this.effects[type] = true;
        this.activeEffect = this.specialTypes.find(e => e.type === type).label;
        let dur = 0;
        if (type === "double") dur = 15000;
        if (type === "invulnerable") {
            dur = 10000;
            this.effects.double = true;
            this.effects.disco = true;
            this.effects.savage = true;
            this.effects.doubleEnd = Date.now() + dur;
            this.effects.discoEnd = Date.now() + dur;
            this.effects.savageEnd = Date.now() + dur;
        }
        if (type === "disco") dur = 15000;
        if (type === "chill") {
            dur = 5000;
            this.speed = this.baseSpeed * 0.66;
        }
        if (type === "savage") dur = 10000;
        if (type === "treasure") {
            this.score += 50;
            this.showPopup("+50", "#f7ff54", 1200);
        }
        if (type === "multifood") {
            this.foods = [];
            this.addFood(5);
            setTimeout(() => { this.foods = []; this.addFood(); }, 10000);
        }
        if (dur > 0) {
            this.effectTimers[type] = setTimeout(() => {
                this.effects[type] = false;
                if (type === "chill") {
                    this.speed = this.baseSpeed + this.snake.length * 0.07;
                }
                if (type === "invulnerable") {
                    this.effects.double = false; this.effects.disco = false; this.effects.savage = false;
                }
                if (this.activeEffect === this.specialTypes.find(e => e.type === type).label) this.activeEffect = null;
                this.updateUI();
            }, dur);
        }
        this.updateUI();
    }

    gameOver(win = false) {
        this.gameState = "gameover";
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem("icenake-highscore", this.highScore);
        }
        if (this.musicEnabled) this.playSound("gameOverSound");
        document.getElementById("finalScore").textContent = this.score;
        document.getElementById("gameOverScreen").classList.remove("hidden");
    }

    updateUI() {
        document.getElementById("scoreUI").innerHTML = `<span style="font-size:1.1em;vertical-align:middle;">💸</span> ${this.score}`;
        let effectTxt = "";
        if (this.activeEffect) {
            effectTxt = this.activeEffect;
        }
        document.getElementById("effectUI").textContent = effectTxt;
    }

    showPopup(text, color = "#fff", ms = 1100) {
        if (!this.popup) return;
        this.popup.textContent = text;
        this.popup.style.display = "block";
        this.popup.style.color = color;
        this.popup.style.opacity = "1";
        clearTimeout(this.popupTimeout);
        this.popupTimeout = setTimeout(() => {
            this.popup.style.opacity = "0";
            setTimeout(() => this.hidePopup(), 240);
        }, ms);
    }

    hidePopup() {
        this.popup.style.display = "none";
    }

    draw() {
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Еда
        this.foods.forEach(f => {
            this.ctx.fillStyle = "#fff";
            this.ctx.fillRect(
                f.x * this.gridSize + 3,
                f.y * this.gridSize + 3,
                this.gridSize - 6,
                this.gridSize - 6
            );
        });

        // Спецпредметы
        this.specials.forEach(s => {
            this.ctx.fillStyle = s.color;
            this.ctx.fillRect(
                s.x * this.gridSize + 2,
                s.y * this.gridSize + 2,
                this.gridSize - 4,
                this.gridSize - 4
            );
        });

        // Змейка
        this.snake.forEach((s, i) => {
            let color = "#71d6e7";
            if (this.effects.disco) {
                const discoColors = ['#f35bb4', '#ae5eff', '#54c2ff', '#31e8ed', '#7e9cff'];
                color = discoColors[(Math.floor(Date.now() / 77) + i) % discoColors.length];
            } else if (this.effects.invulnerable) color = "#ff7ca6";
            else if (this.effects.double) color = "#ae5eff";
            else if (this.effects.savage) color = "#54c2ff";
            else if (this.effects.chill) color = "#7e9cff";
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                s.x * this.gridSize + 1,
                s.y * this.gridSize + 1,
                this.gridSize - 2,
                this.gridSize - 2
            );
        });
    }
}

// Popup стиль для центра
const stylePopup = document.createElement('style');
stylePopup.textContent = `
.effect-popup {
    position: fixed;
    left: 50%; top: 48%;
    transform: translate(-50%,-50%);
    font-family: 'Press Start 2P', monospace;
    font-size: 1.13rem;
    padding: 18px 22px 14px 22px;
    background: #000;
    color: #fff;
    border: 2.5px solid #71d6e7;
    border-radius: 0;
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
    letter-spacing: 2.5px;
    text-align: center;
    display: none;
    transition: opacity 0.23s;
}
`;
document.head.appendChild(stylePopup);

window.addEventListener("resize", () => {
    if (window.icenakeInstance) {
        window.icenakeInstance.setResponsiveField();
    }
});
document.addEventListener("DOMContentLoaded", () => {
    window.icenakeInstance = new ICENAKE();
});
