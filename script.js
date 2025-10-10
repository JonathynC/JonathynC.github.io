// ======= Configuration =======
const remoteLeaderboardUrl = 'https://minesweeper-leaderboard.glitch.me/scores';
; // e.g. 'https://yourdomain.com/scores'

// ======= Presets =======
const presets = {
  beginner: { rows: 9, cols: 9, mines: 10, mult: 1 },
  intermediate: { rows: 16, cols: 16, mines: 40, mult: 2 },
  expert: { rows: 16, cols: 30, mines: 99, mult: 3 }
};

let rows = 9, cols = 9, mines = 10;
let grid = [];
let revealedCount = 0;
let flags = 0;
let minesLeft = mines;
let timerInterval = null;
let timeElapsed = 0;
let started = false;
let gameOver = false;

async function renderRemoteLeaderboard() {
  const leaderboardEl = document.getElementById('leaderboard');
  try {
    const res = await fetch(remoteLeaderboardUrl);
    if (!res.ok) throw new Error('Bad response');
    const data = await res.json();

    const ol = document.createElement('ol');
    data.forEach(it => {
      const li = document.createElement('li');
      li.textContent = `${it.name} — ${it.score} pts — ${it.difficulty} — ${new Date(it.date).toLocaleString()}`;
      ol.appendChild(li);
    });

    leaderboardEl.innerHTML = '';
    leaderboardEl.appendChild(ol);
  } catch (e) {
    leaderboardEl.innerHTML = '<div style="color:var(--muted)">Unable to load leaderboard.</div>';
  }
}

async function saveLastScore(score, won) {
  const name = (playerNameInput.value || 'Anonymous').slice(0, 20);
  const entry = {
    name,
    score,
    time: timeElapsed,
    rows,
    cols,
    mines,
    difficulty: diffSelect.value,
    date: new Date().toISOString(),
    won
  };

  // update local display
  lastScoreEl.textContent = score + (won ? ' (win)' : ' (loss)');

  // save locally
  if (score > 0) {
    const list = loadLocalLeaderboard();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    saveLocalLeaderboard(list.slice(0, 50));
    renderLocalLeaderboard();
  }

  // post to remote leaderboard
  if (remoteLeaderboardUrl && score > 0) {
    try {
      await fetch(remoteLeaderboardUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      // refresh public leaderboard after posting
      renderRemoteLeaderboard();
    } catch (e) {
      console.error('Failed to post score to remote leaderboard', e);
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  // ======= Elements =======
  const gridContainer = document.getElementById('gridContainer');
  const minesLeftEl = document.getElementById('minesLeft');
  const timerEl = document.getElementById('timer');
  const messageEl = document.getElementById('message');
  const startBtn = document.getElementById('startBtn');
  const diffSelect = document.getElementById('difficulty');
  const playerNameInput = document.getElementById('playerName');
  const lastScoreEl = document.getElementById('lastScore');
  const leaderboardEl = document.getElementById('leaderboard');

  // 💡 You need to move ALL your functions here too,
  // or at least ensure they can access these variables.

  // (Paste all your game logic functions here unchanged,
  // just after the variable declarations.)
  // 🔸 renderGrid()
  // 🔸 startGame()
  // 🔸 placeMines()
  // 🔸 etc…

  // ======= UI wiring =======
  startBtn.addEventListener('click', () => startGame());
  diffSelect.addEventListener('change', () => {
    setDifficultyFromSelect();
    startGame();
  });

  // ======= Init =======
  setDifficultyFromSelect();
  startGame();
  renderRemoteLeaderboard();

  if (remoteLeaderboardUrl) {
    renderRemoteLeaderboard();
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') startGame();
  });
});
