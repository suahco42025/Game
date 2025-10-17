// Global vars
let soundEnabled = true;
let voiceEnabled = true;
let globalAudioContext = null;
let currentStudent = JSON.parse(localStorage.getItem('primeStudentData') || '{"name":"Super Student","class":"Fun Class"}');
let sessions = parseInt(localStorage.getItem(`primeSessions_${encodeURIComponent(currentStudent.name)}`) || '0');
let badges = JSON.parse(localStorage.getItem(`primeBadges_${encodeURIComponent(currentStudent.name)}`) || '[]');
let highScore = parseInt(localStorage.getItem(`primeHighScore_${encodeURIComponent(currentStudent.name)}`) || '0');
let totalStars = badges.length * 10;
let currentGame = 0;
let customArtPieces = JSON.parse(localStorage.getItem('primeCustomArt') || '[]');
let audioDebounce = null;

// Helper to format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Audio helpers
function initGlobalAudio() {
    if (!globalAudioContext) {
        globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioContext.state === 'suspended') {
        globalAudioContext.resume();
    }
}
function playSound(type) {
    if (!soundEnabled || !globalAudioContext) return;
    initGlobalAudio();
    const o = globalAudioContext.createOscillator();
    const g = globalAudioContext.createGain();
    o.connect(g); g.connect(globalAudioContext.destination);
    if (type === 'hover') { o.frequency.value = 800; g.gain.value = 0.1; o.type = 'sine'; }
    else if (type === 'click') { o.frequency.value = 600; g.gain.value = 0.2; o.type = 'square'; }
    else if (type === 'win') { o.frequency.value = 523; o.frequency.setTargetAtTime(784, globalAudioContext.currentTime + 0.1, 0.1); g.gain.value = 0.15; o.type = 'sine'; }
    g.gain.exponentialRampToValueAtTime(0.01, globalAudioContext.currentTime + 0.3);
    o.start(); o.stop(globalAudioContext.currentTime + 0.3);
}
function playTone(f, d, t = 'sine', v = 0.1) {
    if (!globalAudioContext) return;
    initGlobalAudio();
    const o = globalAudioContext.createOscillator();
    const g = globalAudioContext.createGain();
    o.connect(g); g.connect(globalAudioContext.destination);
    o.frequency.setValueAtTime(f, globalAudioContext.currentTime);
    o.type = t;
    g.gain.setValueAtTime(0, globalAudioContext.currentTime);
    g.gain.linearRampToValueAtTime(v, globalAudioContext.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.01, globalAudioContext.currentTime + d);
    o.start(globalAudioContext.currentTime);
    o.stop(globalAudioContext.currentTime + d);
}

// --- New Voice Synthesis Functions ---
function speak(text, interrupt = false) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    if (interrupt) {
        window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
}

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const btn = document.getElementById('voice-toggle-btn');
    btn.innerHTML = voiceEnabled ? 'Mute Voice 🔇' : 'Unmute Voice 🔊';
    if (voiceEnabled) speak("Voice enabled."); else window.speechSynthesis.cancel();
}
// Confetti
function showConfetti() {
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.background = ['#ffd700', '#ff6b35', '#4ecdc4'][Math.floor(Math.random() * 3)];
        conf.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 3000);
    }
}

// Student functions
function getSafeKey(key) {
    return `prime${key}_${encodeURIComponent(currentStudent.name)}`;
}
function initDisplay() {
    document.getElementById('student-name').value = currentStudent.name;
    document.getElementById('student-class').value = currentStudent.class;
    document.getElementById('student-name-display').textContent = currentStudent.name;
    document.getElementById('student-class-display').textContent = currentStudent.class;
    document.getElementById('session-count').textContent = sessions;
    document.getElementById('badge-count').textContent = badges.length;
    document.getElementById('high-score').textContent = highScore;
    document.getElementById('stars-fill').style.width = Math.min((totalStars / 100) * 100, 100) + '%';
    document.getElementById('student-form').style.display = 'none';
    document.getElementById('games-section-wrapper').style.display = 'block';
    speak(`Welcome, ${currentStudent.name}! Please choose a game to play.`, true);
}
function startStudentSession() {
    const name = document.getElementById('student-name').value.trim();
    const classSession = document.getElementById('student-class').value.trim() || 'Fun Class';
    if (name.length < 1 || name.length > 25) {
        alert('Name must be 1-20 letters! 🐒');
        return;
    }
    const oldName = currentStudent.name;
    currentStudent = { name, class: classSession };
    localStorage.setItem('primeStudentData', JSON.stringify(currentStudent));
    if (oldName !== name) {
        sessions = parseInt(localStorage.getItem(getSafeKey('Sessions')) || '0'); // Use getSafeKey
        badges = JSON.parse(localStorage.getItem(getSafeKey('Badges')) || '[]'); // Use getSafeKey
        highScore = parseInt(localStorage.getItem(getSafeKey('HighScore')) || '0'); // Use getSafeKey
        totalStars = badges.length * 10;
    }
    initDisplay();
    playSound('click');
}
function showStudentForm() {
    document.getElementById('student-form').style.display = 'block';
    document.getElementById('games-section-wrapper').style.display = 'none';
}

// Mobile
if (window.matchMedia('(pointer: coarse)').matches) {
    document.getElementById('mobile-prompt').style.display = 'flex';
}
function hideMobilePrompt() {
    document.getElementById('mobile-prompt').style.display = 'none';
    initAllAudio();
}

// Audio init
function initAllAudio() {
    clearTimeout(audioDebounce);
    speak("Welcome to the Prime Excellence Daycare School Computer Game! Who is playing today?", true);
    audioDebounce = setTimeout(initGlobalAudio, 100);
}

// Award badge
function awardBadge(gameNum, score, misses) {
    const total = score - misses;
    let badgeType = '';
    if (total >= 100) badgeType = `🏆 ${currentStudent.name}'s Gold Star - Excellence!`;
    else if (total >= 50) badgeType = `⭐ ${currentStudent.name}'s Silver Star - Great Job!`;
    else if (total >= 20) badgeType = `🌟 ${currentStudent.name}'s Bronze Star - Well Done!`;
    else return;

    const badge = { game: gameNum, type: badgeType, date: new Date().toLocaleDateString(), score: total };
    if (!badges.some(b => b.game === gameNum && b.type === badgeType)) {
        badges.push(badge);
        localStorage.setItem(getSafeKey('Badges'), JSON.stringify(badges));
        document.getElementById('badge-count').textContent = badges.length;
        totalStars += 10;
        document.getElementById('stars-fill').style.width = Math.min((totalStars / 100) * 100, 100) + '%';
        alert(`🎉 New Badge Earned: ${badgeType} in Game ${gameNum}! Score: ${total}`);
        showConfetti();
        playSound('win');
    }
    if (total > highScore) {
        highScore = total;
        localStorage.setItem(getSafeKey('HighScore'), highScore);
        document.getElementById('high-score').textContent = highScore;
        alert(`🌟 New High Score for ${currentStudent.name}: ${highScore}!`);
    }
}

function showBadges() {
    playSound('hover');
    const list = document.getElementById('badge-list');
    list.innerHTML = badges.map(b => `<div class="badge-item">${b.type} (Game ${b.game}, ${b.date}, Score: ${b.score})</div>`).join('');
    document.getElementById('badge-modal').style.display = 'flex';
}

function hideBadges() {
    document.getElementById('badge-modal').style.display = 'none';
}

// Custom Art Functions
function showArtCustomModal() {
    playSound('hover');
    updateCustomArtList();
    document.getElementById('art-custom-modal').style.display = 'flex';
}

function hideArtCustomModal() {
    document.getElementById('art-custom-modal').style.display = 'none';
}

function updateCustomArtList() {
    const listEl = document.getElementById('custom-art-list');
    listEl.innerHTML = customArtPieces.map((p, i) => `
        <div class="custom-art-item">
            <span>🎨 ${p.name} (${p.src})</span>
            <button class="btn btn-secondary btn-small" onclick="removeCustomArt(${i})">Remove</button>
        </div>
    `).join('');
}

function addCustomArt() {
    const url = document.getElementById('custom-art-url').value.trim();
    const name = document.getElementById('custom-art-name').value.trim();
    if (!url || !name) { alert('Please provide both an Image URL/Path and a Name.'); return; }
    
    customArtPieces.push({ id: `custom${Date.now()}`, src: url, name: name });
    localStorage.setItem('primeCustomArt', JSON.stringify(customArtPieces));
    updateCustomArtList();
    document.getElementById('custom-art-url').value = '';
    document.getElementById('custom-art-name').value = '';
    playSound('click');
}

function removeCustomArt(index) {
    customArtPieces.splice(index, 1);
    localStorage.setItem('primeCustomArt', JSON.stringify(customArtPieces));
    updateCustomArtList();
}

function resetCustomArt() {
    if (confirm('Are you sure you want to remove all custom art and restore the default images?')) { customArtPieces = []; localStorage.removeItem('primeCustomArt'); updateCustomArtList(); }
}

function endSession(gameNum, score, misses) {
    sessions++;
    localStorage.setItem(getSafeKey('Sessions'), sessions);
    document.getElementById('session-count').textContent = sessions;
    awardBadge(gameNum, score, misses);
}

// Global keydown handler for Games 3 & 4
function globalKeyHandler(e) {
    // The new game objects attach their own listeners, but we'll keep this
    // as a potential hook for future global key events.
    // For now, game-specific key handling is inside each game object.
    // Example: if (e.key === 'Escape') backToLauncher();
}

// Load game
function loadGame(gameNum) {
    playSound('click');
    if (window.matchMedia('(pointer: coarse)').matches && !globalAudioContext) {
        alert('Tap the screen first to enable sounds! 👆');
        return;
    }
    document.getElementById('launcher').style.transition = 'opacity 0.5s';
    document.getElementById('launcher').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('launcher').style.display = 'none';
        document.getElementById('game-area').style.display = 'block'; //Fix: removed display of "none" to display of "block"
        // Instead of a number, currentGame will hold the game object. Get selected level from radio buttons.
        const level = document.querySelector('input[name="game-level"]:checked').value;
        const game = gameFactory(gameNum, level);
        if (game) {
            currentGame = game;
            speak(game.instruction, true);
            game.start(document.getElementById('game-area'));
        }
    }, 500);
}

// Back to launcher
function backToLauncher() {
    playSound('click');
    if (window.clearTimeouts) window.clearTimeouts();
    document.getElementById('game-area').style.transition = 'opacity 0.5s';
    document.getElementById('game-area').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('game-area').innerHTML = '';
        document.getElementById('game-area').style.display = 'none';
        document.getElementById('launcher').style.display = 'block';
        document.getElementById('launcher').style.opacity = '1';
        if (currentGame && typeof currentGame.stop === 'function') {
            currentGame.stop(); // This was correct, but let's ensure it's called.
        }
        currentGame = null;
        // Remove game-specific event listeners
        window.removeEventListener('keydown', window.gameKeyHandler);
    }, 500);
}

// A more modular approach using a "Factory" pattern
function gameFactory(gameNum, level = 'medium') {
    const levelSettings = {
        easy:   { time: 300, speed: 1.0, complexity: 1.0 },
        medium: { time: 240, speed: 1.5, complexity: 1.5 },
        hard:   { time: 180, speed: 2.0, complexity: 2.0 }
    };
    const settings = levelSettings[level];
    const gameArea = document.getElementById('game-area');

    // Common cleanup function for all games. It should only clear the area.
    const clearGameArea = () => {
        gameArea.innerHTML = '';
    };

    // Game 1: Mouse Trainer
    if (gameNum === 1) {
         return {
            instruction: "Click the red targets as fast as you can!",
            score: 0,
            timeLeft: settings.time,
            active: false,
            timerId: null,
            currentTarget: null,
            start: function(container) {
                clearGameArea();
                this.stop(); // Clear any previous state
                this.timeLeft = settings.time;
                this.active = true;
                this.score = 0;
                this.timeLeft = 300;
                
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()" aria-label="Go back home">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score1">Score: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill1"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer1">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill1"></div></div></div></div>
                    </div>
                    <div id="game-over1" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(0,0,0,0.8); padding: 40px; border-radius: 10px; color: white; display: none;">
                        <h2>Game Over!</h2>
                        <p>Final Score: <span id="final-score1">0</span></p>
                        <button onclick="currentGame.start(document.getElementById('game-area'))">Play Again</button>
                    </div>`;
                const css = `
                    .target { position: absolute; width: ${80 / settings.speed}px; height: ${80 / settings.speed}px; background: radial-gradient(circle, #ff6b6b, #ee5a24); border-radius: 50%; cursor: pointer; transition: transform 0.1s ease; z-index: 5; }
                    .target:hover { transform: scale(1.1); }
                    .target.clicked { background: radial-gradient(circle, #4ecdc4, #44a08d); transform: scale(0.8); }`;
                
                container.innerHTML = html;
                const styleEl = document.createElement('style');
                styleEl.textContent = css;
                container.appendChild(styleEl);

                this.updateTimer();
                this.createTarget();
            },
            createTarget: function() {
                if (!this.active) return;
                if (this.currentTarget) this.currentTarget.remove();
                const target = document.createElement('div');
                target.className = 'target';
                target.style.left = Math.random() * (window.innerWidth - (80 / settings.speed)) + 'px';
                target.style.top = Math.random() * (window.innerHeight - (80 / settings.speed)) + 'px';
                
                const handleClick = (e) => {
                    if (e.type === 'touchstart') e.preventDefault();
                    target.classList.add('clicked');
                    this.score++;
                    document.getElementById('hud-score1').innerHTML = `Score: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill1" style="width: ${Math.min((this.score / 50) * 100, 100)}%"></div></div>`;
                    setTimeout(() => target.remove(), 150);
                    this.createTarget();
                };
                target.onclick = target.ontouchstart = handleClick;
                
                setTimeout(() => { if (target.parentNode && this.active) { target.remove(); this.createTarget(); } }, 4000 / settings.speed);
                gameArea.appendChild(target);
                this.currentTarget = target;
            },
            updateTimer: function() {
                if (!this.active) return;
                this.timerId = setTimeout(() => this.updateTimer(), 1000); // Timer speed is constant
                document.getElementById('hud-timer1').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill1" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) {
                    this.stop();
                    document.getElementById('final-score1').textContent = this.score;
                    document.getElementById('game-over1').style.display = 'block';
                    speak(`Game over! Your final score is ${this.score}.`, true);
                    endSession(1, this.score, 0);
                }
            },
            stop: function() {
                this.active = false;
                clearTimeout(this.timerId);
                if (this.currentTarget) this.currentTarget.remove();
            }
        };
    } 
    // Game 2: Banana Chase
    if (gameNum === 2) {
        return {
            instruction: "Let's chase some bananas! Click on them to grab them.",
            score: 0, timeLeft: settings.time, active: false, timerId: null, currentTarget: null,
            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0;
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score2">🍌 Grabbed: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill2"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer2">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill2"></div></div></div></div>
                    </div>
                    <div id="game-over2" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 215, 0, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; box-shadow: 0 0 20px rgba(0,0,0,0.3); display: none;">
                        <h2>🍌 Jungle Jam! 🍌</h2><p>Final Bananas: <span id="final-score2">0</span></p><button onclick="currentGame.start(document.getElementById('game-area'))">Swing Again!</button>
                    </div>`;
                const css = `.banana { position: absolute; width: 40px; height: 80px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 20px 20px 10px 10px; cursor: pointer; transition: transform 0.2s ease; z-index: 5; animation: bob 1.5s ease-in-out infinite; } .banana:hover { transform: scale(1.1) rotate(5deg); } .banana.grabbed { background: linear-gradient(45deg, #4ecdc4, #44a08d); transform: scale(0.9) rotate(-10deg); animation: none; }`;
                container.innerHTML = html;
                const styleEl = document.createElement('style'); styleEl.textContent = css; container.appendChild(styleEl);
                this.updateTimer(); this.createTarget();
            },
            createTarget: function() {
                if (!this.active) return;
                if (this.currentTarget) this.currentTarget.remove();
                const target = document.createElement('div'); target.className = 'banana';
                target.style.left = Math.random() * (window.innerWidth - 40) + 'px';
                target.style.top = Math.random() * (window.innerHeight - 120) + 'px';
                const handleClick = (e) => {
                    if (e.type === 'touchstart') e.preventDefault();
                    target.classList.add('grabbed'); this.score++;
                    document.getElementById('hud-score2').innerHTML = `🍌 Grabbed: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill2" style="width: ${Math.min((this.score / 30) * 100, 100)}%"></div></div>`;
                    setTimeout(() => target.remove(), 200); this.createTarget();
                };
                target.onclick = target.ontouchstart = handleClick;
                setTimeout(() => { if (target.parentNode && this.active) { target.remove(); this.createTarget(); } }, 5000 / settings.speed);
                gameArea.appendChild(target); this.currentTarget = target;
            },
            updateTimer: function() {
                if (!this.active) return;
                this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer2').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill2" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) {
                    this.stop();
                    document.getElementById('final-score2').textContent = this.score;
                    document.getElementById('game-over2').style.display = 'block';
                    speak(`Great job! You grabbed ${this.score} bananas.`, true);
                    endSession(2, this.score, 0);
                }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); if (this.currentTarget) this.currentTarget.remove(); }
        };
    }
    // Game 3: Typewriter
    if (gameNum === 3) {
        return {
            instruction: "Let's practice typing! Press the key for the letter you see on the screen.",
            score: 0, misses: 0, timeLeft: settings.time, active: false, timerId: null, letterTimeout: null, currentLetter: 'A',
            handleKey: function(e) {
                initGlobalAudio(); if (!this.active) return;
                const k = e.key.toUpperCase();
                const letterEl = document.getElementById('current-letter');
                if (k === this.currentLetter) {
                    clearTimeout(this.letterTimeout); this.score++;
                    document.getElementById('hud-score3').innerHTML = `🍌 Typed: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill3" style="width: ${Math.min((this.score / 30) * 100, 100)}%"></div></div>`;
                    letterEl.classList.add('correct'); playTone(440, 0.3, 'sine', 0.1); playTone(880, 0.3, 'sine', 0.1);
                    setTimeout(() => { letterEl.classList.remove('correct'); this.updateLetter(); }, 300);
                } else if (/^[A-Z]$/.test(k)) {
                    clearTimeout(this.letterTimeout); this.misses++;
                    document.getElementById('hud-misses3').innerHTML = `❌ Missed: ${this.misses} <div class="progress-bar"><div class="progress-fill" id="miss-fill3" style="background: #ff4757; width: ${Math.min((this.misses / 10) * 100, 100)}%"></div></div>`;
                    letterEl.classList.add('wrong'); playTone(200, 0.2, 'square', 0.05);
                    speak("Oops, try again!", true);
                    setTimeout(() => { letterEl.classList.remove('wrong'); this.startLetterTimer(); }, 500);
                }
            },
            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0; this.misses = 0;
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score3">🍌 Typed: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill3"></div></div></div>
                            <div class="hud-timer" id="hud-misses3" style="color: #ff4757;">❌ Missed: 0 <div class="progress-bar"><div class="progress-fill" id="miss-fill3" style="background: #ff4757;"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer3">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill3"></div></div></div></div>
                    </div>
                    <div id="current-letter" style="font-size: 200px; font-weight: bold; color: #ff6b35; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); transition: all 0.3s ease; user-select: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">A</div>
                    <div id="game-over3" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 215, 0, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; display: none;">
                        <h2>🍌 Typewriter Tango Over! 🍌</h2><p>Final Bananas: <span id="final-score3">0</span></p><p>Misses: <span id="final-misses3">0</span></p><button onclick="currentGame.start(document.getElementById('game-area'))">Type Again!</button>
                    </div>`;
                const css = `#current-letter.correct { color: #4ecdc4; transform: translate(-50%, -50%) scale(1.2); } #current-letter.wrong { color: #ff4757; animation: shake 0.5s ease; }`;
                container.innerHTML = html;
                const styleEl = document.createElement('style'); styleEl.textContent = css; container.appendChild(styleEl);
                window.gameKeyHandler = this.handleKey.bind(this);
                window.addEventListener('keydown', window.gameKeyHandler);
                this.updateLetter(); this.updateTimer();
            },
            updateLetter: function() {
                this.currentLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                document.getElementById('current-letter').textContent = this.currentLetter;
                this.startLetterTimer();
            },
            startLetterTimer: function() {
                clearTimeout(this.letterTimeout);
                this.letterTimeout = setTimeout(() => {
                    if (!this.active) return;
                    this.misses++;
                    document.getElementById('hud-misses3').innerHTML = `❌ Missed: ${this.misses} <div class="progress-bar"><div class="progress-fill" id="miss-fill3" style="background: #ff4757; width: ${Math.min((this.misses / 10) * 100, 100)}%"></div></div>`;
                    const letterEl = document.getElementById('current-letter');
                    letterEl.classList.add('wrong'); playTone(200, 0.2, 'square', 0.05);
                    setTimeout(() => { letterEl.classList.remove('wrong'); this.updateLetter(); }, 500);
                }, 8000 / settings.speed);
            },
            updateTimer: function() {
                if (!this.active) return;
                this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer3').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill3" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) {
                    this.stop();
                    document.getElementById('final-score3').textContent = this.score;
                    document.getElementById('final-misses3').textContent = this.misses;
                    document.getElementById('game-over3').style.display = 'block';
                    speak(`Time's up! You typed ${this.score} letters.`, true);
                    endSession(3, this.score, this.misses);
                }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); clearTimeout(this.letterTimeout); window.removeEventListener('keydown', window.gameKeyHandler); }
        };
    }
    // Game 4: Word Weaver
    if (gameNum === 4) {
        return {
            instruction: "Let's type some words! Spell the word you see on the screen.",
            score: 0, misses: 0, timeLeft: settings.time, active: false, timerId: null, wordTimeout: null, currentWord: '', typedSoFar: '',
            wordList: {
                easy: ['CAT', 'DOG', 'SUN', 'RUN', 'FUN', 'SKY', 'EAT', 'PIG'],
                medium: ['PLAY', 'JUMP', 'BALL', 'STAR', 'TREE', 'BOOK', 'HAPPY'],
                hard: ['MONKEY', 'BANANA', 'SCHOOL', 'SWING', 'JUNGLE', 'PENCIL', 'FRIEND']
            },
            currentWordList: [],
            handleKey: function(e) {
                initGlobalAudio(); if (!this.active) return;
                const k = e.key.toUpperCase();
                const wordEl = document.getElementById('current-word');
                if (/^[A-Z]$/.test(k)) {
                    if (this.typedSoFar + k === this.currentWord) {
                        clearTimeout(this.wordTimeout); this.score++;
                        document.getElementById('hud-score4').innerHTML = `🍌 Words: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill4" style="width: ${Math.min((this.score / 20) * 100, 100)}%"></div></div>`;
                        wordEl.classList.add('correct'); playTone(440, 0.4, 'sine', 0.1); playTone(880, 0.4, 'sine', 0.1);
                        setTimeout(() => { wordEl.classList.remove('correct'); this.updateWord(); }, 400);
                    } else if (this.currentWord.startsWith(this.typedSoFar + k)) {
                        this.typedSoFar += k;
                        document.getElementById('typed-so-far').textContent = this.typedSoFar;
                    } else {
                        clearTimeout(this.wordTimeout); this.misses++;
                        document.getElementById('hud-misses4').innerHTML = `❌ Missed: ${this.misses} <div class="progress-bar"><div class="progress-fill" id="miss-fill4" style="background: #ff4757; width: ${Math.min((this.misses / 10) * 100, 100)}%"></div></div>`;
                        wordEl.classList.add('wrong'); playTone(200, 0.3, 'square', 0.05);
                        this.typedSoFar = ''; document.getElementById('typed-so-far').textContent = '';
                        setTimeout(() => { wordEl.classList.remove('wrong'); this.startWordTimer(); }, 500);
                    }
                }
            },
            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0; this.misses = 0; this.currentWordList = this.wordList[level];
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score4">🍌 Words: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill4"></div></div></div>
                            <div class="hud-timer" id="hud-misses4" style="color: #ff4757;">❌ Missed: 0 <div class="progress-bar"><div class="progress-fill" id="miss-fill4" style="background: #ff4757;"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer4">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill4"></div></div></div></div>
                    </div>
                    <div id="current-word" style="font-size: 120px; font-weight: bold; color: #ff6b35; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); user-select: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
                    <div id="typed-so-far" style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, 0); font-size: 40px; color: #4ecdc4; z-index: 10;"></div>
                    <div id="game-over4" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 215, 0, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; display: none;">
                        <h2>🍌 Word Weaver Womp! 🍌</h2><p>Final Words: <span id="final-score4">0</span></p><p>Misses: <span id="final-misses4">0</span></p><button onclick="currentGame.start(document.getElementById('game-area'))">Weave Again!</button>
                    </div>`;
                const css = `#current-word.correct { color: #4ecdc4; transform: translate(-50%, -50%) scale(1.1); } #current-word.wrong { color: #ff4757; animation: shake 0.5s ease; }`;
                container.innerHTML = html;
                const styleEl = document.createElement('style'); styleEl.textContent = css; container.appendChild(styleEl);
                window.gameKeyHandler = this.handleKey.bind(this);
                window.addEventListener('keydown', window.gameKeyHandler);
                this.updateWord(); this.updateTimer();
            },
            updateWord: function() {
                this.currentWord = this.currentWordList[Math.floor(Math.random() * this.currentWordList.length)];
                this.typedSoFar = '';
                document.getElementById('current-word').textContent = this.currentWord;
                document.getElementById('typed-so-far').textContent = '';
                this.startWordTimer();
            },
            startWordTimer: function() {
                clearTimeout(this.wordTimeout);
                this.wordTimeout = setTimeout(() => {
                    if (!this.active) return; this.misses++;
                    document.getElementById('hud-misses4').innerHTML = `❌ Missed: ${this.misses} <div class="progress-bar"><div class="progress-fill" id="miss-fill4" style="background: #ff4757; width: ${Math.min((this.misses / 10) * 100, 100)}%"></div></div>`;
                    const wordEl = document.getElementById('current-word');
                    wordEl.classList.add('wrong'); playTone(200, 0.3, 'square', 0.05);
                    this.typedSoFar = ''; document.getElementById('typed-so-far').textContent = '';
                    setTimeout(() => { wordEl.classList.remove('wrong'); this.updateWord(); }, 500);
                }, 12000 / settings.complexity);
            },
            updateTimer: function() {
                if (!this.active) return;
                this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer4').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill4" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) {
                    this.stop();
                    document.getElementById('final-score4').textContent = this.score;
                    document.getElementById('final-misses4').textContent = this.misses;
                    document.getElementById('game-over4').style.display = 'block';
                    speak(`Finished! You spelled ${this.score} words.`, true);
                    endSession(4, this.score, this.misses);
                }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); clearTimeout(this.wordTimeout); window.removeEventListener('keydown', window.gameKeyHandler); }
        };
    }
    // Game 5: Rainbow Painter
    if (gameNum === 5) {
        return {
            instruction: "Let's paint a picture! Follow the instructions to learn how to play.",
            score: 0, misses: 0, timeLeft: settings.time, active: false, timerId: null, canvas: null, ctx: null, selectedColor: null, isColoring: false,
            // Define shapes for our picture. A simple house.
            shapes: [],
            tutorialActive: false,
            boundResize: null, boundStart: null, boundMove: null, boundEnd: null, // For listener removal
            tutorialStep: 0,
            colors: ['#A52A2A' /*brown*/, '#32CD32' /*limegreen*/, '#87CEEB' /*skyblue*/, '#FFD700' /*gold*/],

            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0; this.misses = 0; this.selectedColor = null;
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score5">🎨 Shapes: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill5"></div></div></div>
                            <div class="hud-timer" id="hud-misses5" style="color: #ff4757;">❌ Misses: 0 <div class="progress-bar"><div class="progress-fill" id="miss-fill5" style="background: #ff4757;"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer5">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill5"></div></div></div></div>
                    </div>
                    <div id="color-palette-5"></div>
                    <canvas id="paintCanvas" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; cursor: not-allowed; touch-action: none;"></canvas>
                    <div id="game-over5" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 192, 203, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; display: none;">
                        <h2>🎨 Masterpiece Complete! 🎨</h2><p>Final Score: <span id="final-score5">0</span></p><p>Misses: <span id="final-misses5">0</span></p><button onclick="currentGame.start(document.getElementById('game-area'))">Paint Again!</button>
                    </div>`;
                const css = `
                    #color-palette-5 { position: absolute; top: 50%; left: 20px; transform: translateY(-50%); background: rgba(255,255,255,0.8); padding: 10px; border-radius: 15px; display: flex; flex-direction: column; gap: 10px; z-index: 10; }
                    .color-choice { width: 50px; height: 50px; border-radius: 50%; cursor: pointer; border: 3px solid white; transition: all 0.2s; }
                    .color-choice:hover { transform: scale(1.1); }
                    .color-choice.selected { border-color: #ff6b35; transform: scale(1.2); box-shadow: 0 0 10px rgba(0,0,0,0.3); }
                `;
                container.innerHTML = html + `<style>${css}</style>`;
                this.canvas = document.getElementById('paintCanvas'); this.ctx = this.canvas.getContext('2d');
                this.resizeCanvas();
                this.setupPalette();
                this.setupShapes();
                this.drawAllShapes();
                this.boundResize = this.resizeCanvas.bind(this); window.addEventListener('resize', this.boundResize);
                this.boundStart = this.handleColoringStart.bind(this); this.canvas.addEventListener('mousedown', this.boundStart); this.canvas.addEventListener('touchstart', this.boundStart);
                this.boundMove = this.handleColoringMove.bind(this); this.canvas.addEventListener('mousemove', this.boundMove); this.canvas.addEventListener('touchmove', this.boundMove);
                this.boundEnd = this.handleColoringEnd.bind(this); this.canvas.addEventListener('mouseup', this.boundEnd); this.canvas.addEventListener('touchend', this.boundEnd);
                this.canvas.addEventListener('mouseleave', this.boundEnd);
                // Start the tutorial instead of the game directly
                this.startTutorial();
            },
            resizeCanvas: function() { 
                this.canvas.width = window.innerWidth * 0.6; 
                this.canvas.height = window.innerHeight * 0.7;
                this.setupShapes(); // Recalculate shape positions on resize
                this.drawAllShapes();
            },
            setupPalette: function() {
                const palette = document.getElementById('color-palette-5');
                this.colors.forEach(color => {
                    const choice = document.createElement('div');
                    choice.className = 'color-choice';
                    choice.style.backgroundColor = color;
                    choice.dataset.color = color;
                    choice.onclick = () => {
                        if (this.tutorialActive) return; // Disable during tutorial
                        this.selectedColor = color;
                        document.querySelectorAll('.color-choice').forEach(c => c.classList.remove('selected'));
                        choice.classList.add('selected');
                        const safeColor = color.replace('#', '%23');
                        this.canvas.style.cursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M22,2l-3,3l7,7l3-3z M19,5L5,19l-3,8l8-3L24,10z' fill='${safeColor}' stroke='black' stroke-width='1'/%3E%3C/svg%3E") 4 28, auto`;
                        playTone(800, 0.1, 'sine', 0.05);
                    };
                    palette.appendChild(choice);
                });
            },
            setupShapes: function() {
                const w = this.canvas.width;
                const h = this.canvas.height;
                // Define shapes relative to canvas size
                this.shapes = [
                    { path: new Path2D(`M ${w*0.1} ${h*0.9} L ${w*0.1} ${h*0.4} L ${w*0.5} ${h*0.1} L ${w*0.9} ${h*0.4} L ${w*0.9} ${h*0.9} Z`), color: '#87CEEB', filled: false, name: 'sky' },
                    { path: new Path2D(`M ${w*0.2} ${h*0.9} L ${w*0.2} ${h*0.5} L ${w*0.8} ${h*0.5} L ${w*0.8} ${h*0.9} Z`), color: '#32CD32', filled: false, name: 'grass' },
                    { path: new Path2D(`M ${w*0.3} ${h*0.6} L ${w*0.3} ${h*0.3} L ${w*0.5} ${h*0.15} L ${w*0.7} ${h*0.3} L ${w*0.7} ${h*0.6} Z`), color: '#A52A2A', filled: false, name: 'house' },
                    { path: new Path2D(`M ${w*0.4} ${h*0.6} L ${w*0.4} ${h*0.4} L ${w*0.6} ${h*0.4} L ${w*0.6} ${h*0.6} Z`), color: '#FFD700', filled: false, name: 'door' }
                ];
            },
            drawAllShapes: function() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.shapes.forEach(shape => {
                    this.ctx.strokeStyle = '#333';
                    this.ctx.lineWidth = 3;
                    if (shape.filled) {
                        this.ctx.fillStyle = shape.color;
                        this.ctx.fill(shape.path);
                    }
                    this.ctx.stroke(shape.path);
                });
            },
            startTutorial: function() {
                this.tutorialActive = true;
                this.tutorialStep = 0;
                this.runTutorialStep();
            },
            runTutorialStep: function() {
                if (!this.tutorialActive) return;

                const pointer = document.getElementById('tutorial-pointer') || { style: {} };
                const palette = document.getElementById('color-palette-5') || { classList: { remove: () => {} } };
                const canvas = document.getElementById('paintCanvas') || { classList: { remove: () => {} } };
                
                // Cleanup previous step
                if(pointer.style) pointer.style.display = 'none';
                palette.classList.remove('tutorial-highlight');
                canvas.classList.remove('tutorial-highlight');

                switch (this.tutorialStep) {
                    case 0:
                        speak("First, pick a color from the palette on the left.", true);
                        pointer.style.display = 'block';
                        const paletteRect = palette.getBoundingClientRect ? palette.getBoundingClientRect() : { right: 100, top: 100, height: 100 };
                        pointer.style.transform = `translate(${paletteRect.right}px, ${paletteRect.top + paletteRect.height / 2}px)`;
                        palette.classList.add('tutorial-highlight');
                        setTimeout(() => this.runTutorialStep(), 4000);
                        break;
                    case 1:
                        speak("Then, click the matching shape on the canvas to color it in.", true);
                        const canvasRect = canvas.getBoundingClientRect();
                        pointer.style.transform = `translate(${canvasRect.left + canvasRect.width/2}px, ${canvasRect.top + canvasRect.height/2}px)`;
                        palette.classList.remove('tutorial-highlight');
                        canvas.classList.add('tutorial-highlight');
                        setTimeout(() => this.runTutorialStep(), 5000);
                        break;
                    case 2:
                        speak("Great! Now it's your turn. Good luck!", true);
                        canvas.classList.remove('tutorial-highlight');
                        this.endTutorial();
                        break;
                }
                this.tutorialStep++;
            },
            endTutorial: function() {
                this.tutorialActive = false;
                const pointer = document.getElementById('tutorial-pointer');
                if (pointer) pointer.style.display = 'none';
                // Now that the tutorial is over, start the game timer.
                this.updateTimer();
            },
            handleColoringStart: function(e) {
                if (!this.active || this.tutorialActive || !this.selectedColor) { if (!this.selectedColor) { playTone(200, 0.2, 'square', 0.05); speak("First, pick a color from the palette on the left.", true); } return; }
                e.preventDefault();
                this.isColoring = true;
                this.handleColoringMove(e); // Immediately check for coloring
            },
            handleColoringMove: function(e) {
                if (!this.active || !this.isColoring || !this.selectedColor) return;
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX) - rect.left;
                const y = (e.type.includes('touch') ? e.touches[0].clientY : e.clientY) - rect.top;

                // Iterate backwards to click top-most shapes first
                for (let i = this.shapes.length - 1; i >= 0; i--) {
                    const shape = this.shapes[i];
                    if (!shape.filled && this.ctx.isPointInPath(shape.path, x, y)) {
                        if (this.selectedColor === shape.color) {
                            shape.filled = true;
                            this.score++;
                            document.getElementById('hud-score5').innerHTML = `🎨 Shapes: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill5" style="width: ${Math.min((this.score / this.shapes.length) * 100, 100)}%"></div></div>`;
                            playTone(659, 0.2, 'sine', 0.1);
                            this.drawAllShapes();
                            // Check if all shapes are filled
                            if (this.shapes.every(s => s.filled)) {
                                setTimeout(() => {
                                    alert('Great job! You colored the whole picture!');
                                    this.score += 5; // Bonus for finishing
                                    this.setupShapes(); // Reset for next round
                                    this.drawAllShapes();
                                }, 500);
                            }
                        }
                        // We don't handle misses here, only successful coloring.
                        break; // Stop after finding the first shape
                    }
                }
            },
            handleColoringEnd: function(e) {
                if (!this.active) return;
                e.preventDefault();
                this.isColoring = false;
            },
            updateTimer: function() {
                if (!this.active) return; this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer5').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill5" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) { this.stop(); document.getElementById('final-score5').textContent = this.score; document.getElementById('final-misses5').textContent = this.misses; document.getElementById('game-over5').style.display = 'block'; speak(`Time is up! You colored ${this.score} shapes. Well done!`, true); endSession(5, this.score, this.misses); }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); window.removeEventListener('resize', this.boundResize); if(this.canvas) { this.canvas.removeEventListener('mousedown', this.boundStart); this.canvas.removeEventListener('touchstart', this.boundStart); this.canvas.removeEventListener('mousemove', this.boundMove); this.canvas.removeEventListener('touchmove', this.boundMove); this.canvas.removeEventListener('mouseup', this.boundEnd); this.canvas.removeEventListener('touchend', this.boundEnd); this.canvas.removeEventListener('mouseleave', this.boundEnd); } }
        };
    }
    // Game 6: Fruit Drop
    if (gameNum === 6) {
        return {
            instruction: "The monkeys are hungry! Drag each fruit to the correct monkey.",
            score: 0, misses: 0, timeLeft: settings.time, active: false, timerId: null, fruitTimeout: null, currentFruit: null,
            fruits: ['🍎', '🍌', '🍊', '🍇'], fruitTypes: ['apple', 'banana', 'orange', 'grape'],
            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0; this.misses = 0;
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score6">🍎 Dropped: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill6"></div></div></div>
                            <div class="hud-timer" id="hud-misses6" style="color: #ff4757;">❌ Wrong: 0 <div class="progress-bar"><div class="progress-fill" id="miss-fill6" style="background: #ff4757;"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer6">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill6"></div></div></div></div>
                    </div>
                    <div id="monkeys6" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 20px; z-index: 5;"></div>
                    <div id="game-over6" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 215, 0, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; display: none;">
                        <h2>🍎 Feeding Frenzy Over! 🍎</h2><p>Final Fruits: <span id="final-score6">0</span></p><p>Wrong Drops: <span id="final-misses6">0</span></p><button onclick="currentGame.start(document.getElementById('game-area'))">Feed Again!</button>
                    </div>`;
                const css = `.fruit { position: absolute; font-size: 40px; cursor: grab; transition: transform 0.2s; z-index: 6; user-select: none; } .fruit.dragging { transform: rotate(10deg) scale(1.1); opacity: 0.8; } .monkey-slot { width: 80px; height: 80px; border: 3px dashed #ff6b35; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 10px 0; transition: all 0.3s; } .monkey-slot.drop-success { border-color: #4ecdc4; background: rgba(78, 205, 196, 0.2); transform: scale(1.1); } .monkey-slot.drop-fail { border-color: #ff4757; background: rgba(255, 71, 87, 0.2); animation: shake 0.5s ease; }`;
                container.innerHTML = html;
                const styleEl = document.createElement('style'); styleEl.textContent = css; container.appendChild(styleEl);
                const monkeysEl = document.getElementById('monkeys6');
                this.fruitTypes.forEach(type => {
                    const slot = document.createElement('div'); slot.className = 'monkey-slot'; slot.textContent = '🐵'; slot.dataset.fruit = type;
                    slot.addEventListener('dragover', e => e.preventDefault());
                    slot.addEventListener('drop', this.handleDrop.bind(this));
                    monkeysEl.appendChild(slot);
                });
                this.createFruit(); this.updateTimer();
            },
            createFruit: function() {
                if (!this.active) return; if (this.currentFruit) this.currentFruit.remove();
                const idx = Math.floor(Math.random() * this.fruits.length);
                const fruit = document.createElement('div'); fruit.className = 'fruit'; fruit.draggable = true; fruit.textContent = this.fruits[idx]; fruit.dataset.fruit = this.fruitTypes[idx];
                fruit.style.left = '60px'; fruit.style.top = (Math.random() * (window.innerHeight - 100)) + 'px';
                fruit.addEventListener('dragstart', (e) => { fruit.classList.add('dragging'); e.dataTransfer.setData('text/plain', fruit.dataset.fruit); });
                fruit.addEventListener('dragend', () => fruit.classList.remove('dragging'));
                gameArea.appendChild(fruit); this.currentFruit = fruit;
            },
            handleDrop: function(e) {
                e.preventDefault(); if (!this.active) return;
                const droppedFruit = e.dataTransfer.getData('text/plain');
                const slotFruit = e.target.dataset.fruit;
                if (droppedFruit === slotFruit) {
                    this.score++; document.getElementById('hud-score6').innerHTML = `🍎 Dropped: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill6" style="width: ${Math.min((this.score / 20) * 100, 100)}%"></div></div>`;
                    e.target.classList.add('drop-success'); playTone(659, 0.2, 'sine', 0.1);
                    setTimeout(() => e.target.classList.remove('drop-success'), 500);
                } else {
                    this.misses++; document.getElementById('hud-misses6').innerHTML = `❌ Wrong: ${this.misses} <div class="progress-bar"><div class="progress-fill" id="miss-fill6" style="background: #ff4757; width: ${Math.min((this.misses / 10) * 100, 100)}%"></div></div>`;
                    e.target.classList.add('drop-fail'); playTone(200, 0.3, 'square', 0.05);
                    speak("Oops, that's the wrong monkey!", true);
                    setTimeout(() => e.target.classList.remove('drop-fail'), 500);
                }
                this.createFruit();
            },
            updateTimer: function() {
                if (!this.active) return; this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer6').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill6" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) { this.stop(); document.getElementById('final-score6').textContent = this.score; document.getElementById('final-misses6').textContent = this.misses; document.getElementById('game-over6').style.display = 'block'; speak(`Feeding time is over! You fed the monkeys ${this.score} times.`, true); endSession(6, this.score, this.misses); }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); if (this.currentFruit) this.currentFruit.remove(); }
        };
    }
    // Game 7: Art Puzzle
    if (gameNum === 7) {
        return {
            instruction: "Let's solve a puzzle! Drag the pictures from the left onto the matching words.",
            score: 0, misses: 0, timeLeft: settings.time, active: false, timerId: null, piecesPlacedThisRound: 0,
            defaultArtPieces: [
                { id: 'piece1', src: 'Arts/Keyboard.png', name: 'Keyboard' },
                { id: 'piece2', src: 'Arts/Mouse.png', name: 'Mouse' },
                { id: 'piece3', src: 'Arts/Monitor.png', name: 'Monitor' },
                { id: 'piece4', src: 'Arts/System Unit.png', name: 'System Unit' },
                { id: 'piece5', src: 'Arts/Hand on mouse.png', name: 'Hand on Mouse' }
            ],
            artPieces: [], // This will be populated at start
            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0; this.misses = 0; this.piecesPlacedThisRound = 0;
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score7">🎨 Pieces: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill7"></div></div></div>
                            <div class="hud-timer" id="hud-misses7" style="color: #ff4757;">❌ Missed: 0 <div class="progress-bar"><div class="progress-fill" id="miss-fill7" style="background: #ff4757;"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer7">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill7"></div></div></div></div>
                    </div>
                    <div id="art-palette"></div>
                    <div id="art-canvas"></div>
                    <div id="game-over7" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(135, 206, 235, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; display: none;">
                        <h2>🎨 Puzzle Perfect! 🎨</h2><p>Final Score: <span id="final-score7">0</span></p><p>Misses: <span id="final-misses7">0</span></p><button onclick="currentGame.start(document.getElementById('game-area'))">Create Again!</button>
                    </div>`;
                const css = `
                    @keyframes colorful-border {
                        0% { border-color: #ff6b6b; } 25% { border-color: #feca57; } 50% { border-color: #48dbfb; } 75% { border-color: #ff9ff3; } 100% { border-color: #ff6b6b; }
                    }
                    #art-palette { position: absolute; top: 50%; left: 20px; transform: translateY(-50%); background: rgba(255,255,255,0.8); padding: 10px; border-radius: 15px; display: flex; flex-direction: column; gap: 15px; z-index: 10; }
                    .art-piece { width: 80px; height: 80px; cursor: grab; transition: all 0.2s; user-select: none; object-fit: contain; }
                    .art-piece:hover { transform: scale(1.1); }
                    .art-piece.dragging { opacity: 0.5; transform: scale(1.2); cursor: grabbing; }
                    .art-piece.placed { display: none; } /* Hide from palette once placed */
                    .art-slot { position: absolute; width: 150px; height: 100px; border: 3px dashed #a8e6cf; border-radius: 10px; background-size: contain; background-repeat: no-repeat; background-position: center; transition: all 0.3s; animation: colorful-border 4s linear infinite; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #4a4a4a; background-color: rgba(255,255,255,0.7); }
                    .art-slot.drop-success { border-color: #4ecdc4; background-color: rgba(78, 205, 196, 0.3); transform: scale(1.05); }
                    .art-slot.drop-fail { border-color: #ff4757; background-color: rgba(255, 71, 87, 0.3); animation: shake 0.5s ease; }
                `;
                container.innerHTML = html;
                const styleEl = document.createElement('style'); styleEl.textContent = css; container.appendChild(styleEl);
                
                // Use custom art if available, otherwise use default
                this.artPieces = customArtPieces.length > 0 ? customArtPieces : this.defaultArtPieces;
                
                this.setupPuzzle();
                this.updateTimer();
            },
            setupPuzzle: function() {
                const palette = document.getElementById('art-palette');
                const canvas = document.getElementById('art-canvas');
                palette.innerHTML = ''; canvas.innerHTML = '';
                this.piecesPlacedThisRound = 0; // Reset for the new puzzle

                const shuffledPieces = [...this.artPieces].sort(() => Math.random() - 0.5);
                let piecesForLevel = this.artPieces;
                if (level === 'easy' && this.artPieces.length >= 3) piecesForLevel = this.artPieces.slice(0, 3);
                // Medium and Hard will use all available pieces.

                const shuffledSlots = [...piecesForLevel].sort(() => Math.random() - 0.5);

                shuffledPieces.forEach(p => {
                    const pieceEl = document.createElement('img');
                    pieceEl.className = 'art-piece';
                    pieceEl.src = p.src;
                    pieceEl.alt = p.name;
                    pieceEl.dataset.id = p.id;
                    pieceEl.draggable = true;
                    pieceEl.addEventListener('dragstart', e => {
                        e.target.classList.add('dragging');
                        e.dataTransfer.setData('text/plain', e.target.dataset.id);
                    });
                    pieceEl.addEventListener('dragend', e => e.target.classList.remove('dragging'));
                    palette.appendChild(pieceEl);
                });

                shuffledSlots.forEach((p, i) => {
                    const slotEl = document.createElement('div');
                    slotEl.className = 'art-slot';
                    slotEl.dataset.id = p.id;
                    slotEl.textContent = p.name; // Display the name/spelling
                    // Position slots randomly on the canvas area
                    slotEl.style.top = `${10 + Math.random() * 75}%`;
                    slotEl.style.left = `${20 + Math.random() * 65}%`;

                    slotEl.addEventListener('dragover', e => e.preventDefault());
                    slotEl.addEventListener('drop', this.handleDrop.bind(this));
                    canvas.appendChild(slotEl);
                });
            },
            handleDrop: function(e) {
                e.preventDefault(); if (!this.active) return;
                const droppedId = e.dataTransfer.getData('text/plain');
                const slot = e.target;
                const correctPiece = this.artPieces.find(p => p.id === droppedId);

                if (droppedId === slot.dataset.id) {
                    this.score++; this.piecesPlacedThisRound++;
                    document.getElementById('hud-score7').innerHTML = `🎨 Pieces: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill7" style="width: ${Math.min((this.score / 50) * 100, 100)}%"></div></div>`;
                    slot.classList.add('drop-success'); playTone(659, 0.2, 'sine', 0.1);
                    slot.textContent = ''; // Remove the word
                    slot.style.backgroundImage = `url(${correctPiece.src})`; // Show the image
                    document.querySelector(`.art-piece[data-id='${droppedId}']`).classList.add('placed');
                    if (this.piecesPlacedThisRound === this.artPieces.length) { setTimeout(() => { this.setupPuzzle(); }, 500); }
                } else {
                    this.misses++; document.getElementById('hud-misses7').innerHTML = `❌ Missed: ${this.misses} <div class="progress-bar"><div class="progress-fill" id="miss-fill7" style="background: #ff4757; width: ${Math.min((this.misses / 5) * 100, 100)}%"></div></div>`;
                    slot.classList.add('drop-fail'); playTone(200, 0.3, 'square', 0.05);
                    speak("That piece doesn't fit here. Try another spot.", true);
                    setTimeout(() => slot.classList.remove('drop-fail'), 500);
                }
            },
            updateTimer: function() {
                if (!this.active) return; this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer7').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill7" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) { this.stop(); document.getElementById('final-score7').textContent = this.score; document.getElementById('final-misses7').textContent = this.misses; document.getElementById('game-over7').style.display = 'block'; speak(`Puzzle time is over! You placed ${this.score} pieces correctly.`, true); endSession(7, this.score, this.misses); }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); }
        };
    }
    // Game 8: Sentence Scribe
    if (gameNum === 8) {
        return {
            instruction: "Let's practice typing sentences! Type the sentence exactly as you see it.",
            score: 0, misses: 0, timeLeft: settings.time, active: false, timerId: null, sentenceTimeout: null, currentSentence: '', typedIndex: 0,
            sentenceList: {
                easy: ["the cat is on the mat", "a red bug ran", "the sun is hot", "i can see a pig", "we like to play"],
                medium: ["The quick brown fox jumps over the lazy dog.", "Monkeys love to eat yellow bananas.", "School is a fun place to learn new things."],
                hard: ["The jungle is a wonderful, exciting place to play with all my friends!", "Practice makes perfect, so let's keep on typing every day!", "Computers can help us learn and create amazing art."]
            },
            currentSentenceList: [],
            handleKey: function(e) {
                initGlobalAudio(); if (!this.active) return;
                const sentenceEl = document.getElementById('current-sentence');
                if (!sentenceEl) return;

                // Allow Backspace to correct mistakes
                if (e.key === 'Backspace' && this.typedIndex > 0) {
                    this.typedIndex--;
                    this.updateSentenceDisplay();
                    return;
                }

                // Check for valid character input
                if (e.key.length > 1) return; // Ignore keys like Shift, Ctrl, etc.

                const expectedChar = this.currentSentence[this.typedIndex];
                if (e.key === expectedChar) {
                    this.typedIndex++;
                    this.updateSentenceDisplay();
                    playTone(440 + (this.typedIndex * 10), 0.1, 'sine', 0.05);

                    if (this.typedIndex === this.currentSentence.length) {
                        clearTimeout(this.sentenceTimeout);
                        this.score++;
                        document.getElementById('hud-score8').innerHTML = `📜 Sentences: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill8" style="width: ${Math.min((this.score / 10) * 100, 100)}%"></div></div>`;
                        sentenceEl.classList.add('correct');
                        playTone(880, 0.3, 'sine', 0.1);
                        setTimeout(() => { sentenceEl.classList.remove('correct'); this.updateSentence(); }, 500);
                    }
                } else {
                    this.misses++;
                    document.getElementById('hud-misses8').innerHTML = `❌ Missed: ${this.misses} <div class="progress-bar"><div class="progress-fill" id="miss-fill8" style="background: #ff4757; width: ${Math.min((this.misses / 10) * 100, 100)}%"></div></div>`;
                    sentenceEl.classList.add('wrong');
                    playTone(200, 0.2, 'square', 0.05);
                    speak("Oops!", true);
                    setTimeout(() => sentenceEl.classList.remove('wrong'), 500);
                }
            },
            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0; this.misses = 0; this.currentSentenceList = this.sentenceList[level];
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score8">📜 Sentences: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill8"></div></div></div>
                            <div class="hud-timer" id="hud-misses8" style="color: #ff4757;">❌ Missed: 0 <div class="progress-bar"><div class="progress-fill" id="miss-fill8" style="background: #ff4757;"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer8">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill8"></div></div></div></div>
                    </div>
                    <div id="current-sentence" style="font-size: 4vw; max-width: 80%; font-weight: bold; color: #ff6b35; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); user-select: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255,255,255,0.8); padding: 20px; border-radius: 15px;"></div>
                    <div id="game-over8" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 215, 0, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; display: none;">
                        <h2>📜 Scribe Session Over! 📜</h2><p>Final Score: <span id="final-score8">0</span></p><p>Misses: <span id="final-misses8">0</span></p><button onclick="currentGame.start(document.getElementById('game-area'))">Scribe Again!</button>
                    </div>`;
                const css = `#current-sentence.correct { color: #4ecdc4; } #current-sentence.wrong { animation: shake 0.5s ease; } .typed-char { color: #4ecdc4; } .untyped-char { color: #a0a0a0; }`;
                container.innerHTML = html + `<style>${css}</style>`;
                window.gameKeyHandler = this.handleKey.bind(this); window.addEventListener('keydown', window.gameKeyHandler);
                this.updateSentence(); this.updateTimer();
            },
            updateSentence: function() {
                this.currentSentence = this.currentSentenceList[Math.floor(Math.random() * this.currentSentenceList.length)];
                this.typedIndex = 0;
                this.updateSentenceDisplay();
            },
            updateSentenceDisplay: function() {
                const typedPart = this.currentSentence.substring(0, this.typedIndex);
                const untypedPart = this.currentSentence.substring(this.typedIndex);
                document.getElementById('current-sentence').innerHTML = `<span class="typed-char">${typedPart}</span><span class="untyped-char">${untypedPart}</span>`;
            },
            updateTimer: function() {
                if (!this.active) return;
                this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer8').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill8" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) { this.stop(); document.getElementById('final-score8').textContent = this.score; document.getElementById('final-misses8').textContent = this.misses; document.getElementById('game-over8').style.display = 'block'; speak(`Time's up! You typed ${this.score} sentences.`, true); endSession(8, this.score, this.misses); }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); clearTimeout(this.sentenceTimeout); window.removeEventListener('keydown', window.gameKeyHandler); }
        };
    }
    // Game 9: Story Self
    if (gameNum === 9) {
        return {
            instruction: "Let's write about you! Type your answer to the question and press the 'Done!' button.",
            score: 0, timeLeft: settings.time, active: false, timerId: null,
            prompts: [
                "My name is...",
                "My favorite color is...",
                "I like to play with...",
                "My favorite animal is a...",
                "For fun, I like to...",
                "Today I feel...",
                "My best friend is...",
                "I am good at...",
                "My favorite food is...",
                "When I grow up, I want to be...",
                "A place I want to visit is...",
                "Something that makes me laugh is...",
                "My favorite book or story is...",
                "If I had a superpower, it would be..."
            ],
            currentPromptIndex: 0,
            start: function(container) {
                clearGameArea(); this.stop(); this.timeLeft = settings.time;
                this.active = true; this.score = 0; this.currentPromptIndex = 0;
                const html = `
                    <div id="game-hud">
                        <div class="hud-left"><button class="back-btn" onclick="backToLauncher()">Swing Home! 🏠</button></div>
                        <div class="hud-center">
                            <div class="hud-score" id="hud-score9">✍️ Stories: 0 <div class="progress-bar"><div class="progress-fill" id="score-fill9"></div></div></div>
                        </div>
                        <div class="hud-right"><div class="hud-timer" id="hud-timer9">Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill9"></div></div></div></div>
                    </div>
                    <div id="story-self-area" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 80%; max-width: 800px;">
                        <h2 id="story-prompt" style="font-size: 4vw; color: #ff6b35;"></h2>
                        <textarea id="story-input" placeholder="Type your sentence here..." style="width: 100%; height: 100px; font-size: 2vw; padding: 10px; border-radius: 15px; border: 3px solid #4ecdc4; margin-top: 20px; font-family: inherit;"></textarea>
                        <button id="story-submit" class="btn btn-primary" style="margin-top: 20px; font-size: 24px;">Done! 👍</button>
                    </div>
                    <div id="game-over9" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 215, 0, 0.9); padding: 40px; border-radius: 20px; color: #4a4a4a; display: none;">
                        <h2>✍️ Story Time Over! ✍️</h2><p>You wrote <span id="final-score9">0</span> stories about yourself!</p><button onclick="currentGame.start(document.getElementById('game-area'))">Write More!</button>
                    </div>`;
                container.innerHTML = html;
                document.getElementById('story-submit').onclick = this.submitAnswer.bind(this);
                this.updatePrompt();
                this.updateTimer();
            },
            updatePrompt: function() {
                if (this.currentPromptIndex >= this.prompts.length) {
                    this.currentPromptIndex = 0; // Loop back to the start
                }
                document.getElementById('story-prompt').textContent = this.prompts[this.currentPromptIndex];
                document.getElementById('story-input').value = '';
                document.getElementById('story-input').focus();
            },
            submitAnswer: function() {
                const answer = document.getElementById('story-input').value.trim();
                if (answer.length > 2) { // Require at least 3 characters
                    this.score++;
                    document.getElementById('hud-score9').innerHTML = `✍️ Stories: ${this.score} <div class="progress-bar"><div class="progress-fill" id="score-fill9" style="width: ${Math.min((this.score / 10) * 100, 100)}%"></div></div>`;
                    playTone(880, 0.3, 'sine', 0.1);
                    this.currentPromptIndex++;
                    this.updatePrompt();
                } else {
                    playTone(200, 0.2, 'square', 0.05);
                    speak("Try writing a little more!", true);
                }
            },
            updateTimer: function() {
                if (!this.active) return;
                this.timerId = setTimeout(() => this.updateTimer(), 1000);
                document.getElementById('hud-timer9').innerHTML = `Time: ${formatTime(this.timeLeft)} <div class="progress-bar"><div class="progress-fill" id="timer-fill9" style="width: ${Math.min((300 - this.timeLeft) / 300 * 100, 100)}%"></div></div>`;
                this.timeLeft--;
                if (this.timeLeft < 0) { this.stop(); document.getElementById('final-score9').textContent = this.score; document.getElementById('game-over9').style.display = 'block'; speak(`Time's up! You wrote ${this.score} sentences about yourself. Great job!`, true); endSession(9, this.score, 0); }
            },
            stop: function() { this.active = false; clearTimeout(this.timerId); }
        };
    }
    return null; // Return null if game not found
}

window.clearTimeouts = function() {
    // This becomes much simpler. The backToLauncher function handles this.
    // We can also be more robust by clearing all possible timeouts.
    let id = window.setTimeout(function() {}, 0);
    while (id--) {
        window.clearTimeout(id);
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', globalKeyHandler);
    if (currentStudent.name !== 'Super Student' || currentStudent.class !== 'Fun Class') {
        initDisplay();
    }
});