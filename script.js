// --- Game settings ---
const presets = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 }
};

let rows = 9, cols = 9, mines = 10;
let grid = [];
let revealedCount = 0, flags = 0, minesLeft = mines;
let timerInterval = null, timeElapsed = 0, started = false, gameOver = false;

// --- DOM elements ---
let gridContainer, minesLeftEl, timerEl, messageEl, startBtn, diffSelect, playerNameInput, leaderboardEl;

// --- Set difficulty ---
function setDifficultyFromSelect() {
  const v = diffSelect.value;
  if (v === 'custom') { rows = 12; cols = 12; mines = 20; }
  else { const p = presets[v]; rows = p.rows; cols = p.cols; mines = p.mines; }
  minesLeft = mines;
  minesLeftEl.textContent = minesLeft;
}

// --- Place mines avoiding first click ---
function placeMines(safeR, safeC) {
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (grid[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    grid[r][c].mine = true;
    placed++;
  }

  // Compute adjacent mine counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let adj = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          if (grid[nr][nc].mine) adj++;
        }
      }
      grid[r][c].adj = adj;
    }
  }
}

// --- Start game ---
function startGame() {
  const player = playerNameInput.value.trim();
  if (!player) {
    messageEl.textContent = "Please enter your name to start!";
    return;
  }

  setDifficultyFromSelect();
  grid = Array(rows).fill(null).map(() =>
    Array(cols).fill().map(() => ({ mine: false, adj: 0, revealed: false, flag: false }))
  );
  revealedCount = 0; flags = 0; minesLeft = mines; timeElapsed = 0; started = false; gameOver = false;
  messageEl.textContent = '';
  clearInterval(timerInterval);
  timerEl.textContent = '0';
  minesLeftEl.textContent = minesLeft;
  renderGrid();
}

// --- Render grid ---
function renderGrid() {
  gridContainer.innerHTML = '';
  const gridEl = document.createElement('div');
  gridEl.className = 'grid';
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 32px)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell hidden';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('click', onCellClick);
      cell.addEventListener('contextmenu', onCellRightClick);

      // Touch support for flag
      let pressTimer = null;
      cell.addEventListener('touchstart', e => { pressTimer = setTimeout(() => onCellRightClick(e), 600); });
      cell.addEventListener('touchend', () => { if (pressTimer) clearTimeout(pressTimer); });

      gridEl.appendChild(cell);
    }
  }

  gridContainer.appendChild(gridEl);
}

// --- Cell click ---
function onCellClick(e) {
  if (gameOver) return;
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;

  if (!started) {
    placeMines(r, c);
    started = true;
    startTimer();
  }

  const cell = grid[r][c];
  if (cell.revealed || cell.flag) return;
  revealCell(r, c);
  checkWin();
}

// --- Right-click / flag ---
function onCellRightClick(e) {
  e.preventDefault();
  if (gameOver) return;
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  const cell = grid[r][c];

  if (!started) {
    placeMines(r, c);
    started = true;
    startTimer();
  }

  if (cell.revealed) return;

  cell.flag = !cell.flag;
  if (cell.flag) {
    e.currentTarget.classList.remove('hidden');
    e.currentTarget.classList.add('flag');
    e.currentTarget.textContent = '⚑';
    flags++;
    minesLeft--;
  } else {
    e.currentTarget.classList.remove('flag');
    e.currentTarget.classList.add('hidden');
    e.currentTarget.textContent = '';
    flags--;
    minesLeft++;
  }
  minesLeftEl.textContent = minesLeft;
}

// --- Reveal cells ---
function revealCell(r, c) {
  const cell = grid[r][c];
  if (cell.revealed || cell.flag) return;
  cell.revealed = true; revealedCount++;
  const el = getCellEl(r, c); el.classList.remove('hidden'); el.classList.add('revealed'); el.textContent = '';

  if (cell.mine) {
    el.classList.add('mine'); el.textContent = '💣';
    loseGame();
    return;
  }

  if (cell.adj > 0) {
    el.textContent = cell.adj;
    el.style.color = numberColor(cell.adj);
  } else {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (!grid[nr][nc].revealed) revealCell(nr, nc);
      }
    }
  }
}

// --- Helpers ---
function numberColor(n) {
  const colors = ['#1e90ff','#10b981','#f59e0b','#ef4444','#7c3aed','#db2777','#14b8a6','#64748b'];
  return colors[(n-1) % colors.length];
}

function getCellEl(r, c) {
  const gridEl = gridContainer.querySelector('.grid');
  return gridEl.children[r * cols + c];
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeElapsed++;
    timerEl.textContent = timeElapsed;
  }, 1000);
}

function loseGame() {
  gameOver = true;
  clearInterval(timerInterval);
  messageEl.textContent = "💥 Game Over! You hit a mine.";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const el = getCellEl(r, c);
      if (cell.mine) {
        el.classList.remove("hidden");
        el.classList.add("mine");
        el.textContent = "💣";
      }
    }
  }
}

// --- Check win ---
function checkWin() {
  if (revealedCount === rows * cols - mines) {
    gameOver = true;
    clearInterval(timerInterval);
    messageEl.textContent = "🎉 You Win!";

    const player = playerNameInput.value.trim();
    const difficulty = diffSelect.value;
    const time = timeElapsed || 0; // save zero if needed
    saveScore(player, difficulty, time);

    // Reveal all mines visually
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const el = getCellEl(r, c);
        if (cell.mine) {
          el.classList.remove("hidden");
          el.classList.add("mine");
          el.textContent = "💣";
        }
      }
    }
  }
}

// --- Supabase ---
async function saveScore(player, difficulty, time) {
  const { error } = await supabaseClient
    .from("scores")
    .insert([{ player_name: player, difficulty, time_seconds: time }]);
  if (error) console.error("Error saving score:", error);
}

async function loadLeaderboard() {
  const difficulties = ["beginner", "intermediate", "expert", "custom"];
  let html = "";

  for (const diff of difficulties) {
    const { data, error } = await supabaseClient
      .from("scores")
      .select("*")
      .eq("difficulty", diff)
      .order("time_seconds", { ascending: true })
      .limit(10);

    if (error) {
      console.error(`Error loading leaderboard for ${diff}:`, error);
      continue;
    }

    if (data.length > 0) {
      html += `<h4>${diff.charAt(0).toUpperCase() + diff.slice(1)}</h4>`;
      html += data.map((row, i) => `<div>${i + 1}. ${row.player_name} — ${row.time_seconds}s</div>`).join("");
    }
  }

  leaderboardEl.innerHTML = html || "<div>No scores yet.</div>";
}

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
  gridContainer = document.getElementById("gridContainer");
  minesLeftEl = document.getElementById("minesLeft");
  timerEl = document.getElementById("timer");
  messageEl = document.getElementById("message");
  startBtn = document.getElementById("startBtn");
  diffSelect = document.getElementById("difficulty");
  playerNameInput = document.getElementById("playerName");
  leaderboardEl = document.getElementById("leaderboard");

  startBtn.disabled = true;
  playerNameInput.addEventListener("input", () => {
    startBtn.disabled = playerNameInput.value.trim() === "";
  });

  startBtn.addEventListener("click", startGame);

  loadLeaderboard();
  setInterval(loadLeaderboard, 5000);
});
