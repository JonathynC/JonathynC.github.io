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

// DOM elements
let gridContainer, minesLeftEl, timerEl, messageEl, startBtn, diffSelect, playerNameInput, lastScoreEl, leaderboardEl;

function setDifficultyFromSelect() {
  const v = diffSelect.value;
  if (v === 'custom') { rows = 12; cols = 12; mines = 20; }
  else { const p = presets[v]; rows = p.rows; cols = p.cols; mines = p.mines; }
  minesLeft = mines;
  minesLeftEl.textContent = minesLeft;
}

function startGame() {
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

function placeMines(safeR, safeC) {
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (grid[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    grid[r][c].mine = true; placed++;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let adj = 0;
      for (let dr=-1; dr<=1; dr++){
        for(let dc=-1; dc<=1; dc++){
          const nr=r+dr, nc=c+dc;
          if(nr<0||nc<0||nr>=rows||nc>=cols) continue;
          if(grid[nr][nc].mine) adj++;
        }
      }
      grid[r][c].adj = adj;
    }
  }
}

function renderGrid() {
  gridContainer.innerHTML = '';
  const gridEl = document.createElement('div');
  gridEl.className = 'grid';
  gridEl.style.gridTemplateColumns = `repeat(${cols},32px)`;
  gridEl.style.gridGap = '2px';
  for (let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cell = document.createElement('div');
      cell.className = 'cell hidden';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('click', onCellClick);
      cell.addEventListener('contextmenu', onCellRightClick);
      let pressTimer=null;
      cell.addEventListener('touchstart', e=>{ pressTimer=setTimeout(()=>onCellRightClick(e),600); });
      cell.addEventListener('touchend', ()=>{ if(pressTimer) clearTimeout(pressTimer); });
      gridEl.appendChild(cell);
    }
  }
  gridContainer.appendChild(gridEl);
}

function onCellClick(e) {
  if(gameOver) return;
  const r=+this.dataset.r, c=+this.dataset.c;
  if(!started){ placeMines(r,c); started=true; startTimer(); }
  const cell = grid[r][c];
  if(cell.revealed||cell.flag) return;
  revealCell(r,c);
  checkWin();
}

function onCellRightClick(e) {
  e.preventDefault();
  if(gameOver) return;
  const target = e.currentTarget||e.target;
  const r=+target.dataset.r, c=+target.dataset.c;
  const cell = grid[r][c];
  if(!started){ placeMines(r,c); started=true; startTimer(); }
  if(cell.revealed) return;
  cell.flag = !cell.flag;
  if(cell.flag){ target.classList.remove('hidden'); target.classList.add('flag'); target.textContent='⚑'; flags++; minesLeft--; }
  else { target.classList.remove('flag'); target.classList.add('hidden'); target.textContent=''; flags--; minesLeft++; }
  minesLeftEl.textContent = minesLeft;
}

function revealCell(r,c){
  const cell = grid[r][c];
  if(cell.revealed||cell.flag) return;
  cell.revealed = true; revealedCount++;
  const el = getCellEl(r,c); el.classList.remove('hidden'); el.classList.add('revealed'); el.textContent='';
  if(cell.mine){ el.classList.add('mine'); el.textContent='💣'; loseGame(); return; }
  if(cell.adj>0){ el.textContent=cell.adj; el.style.color=numberColor(cell.adj); }
  else { for(let dr=-1;dr<=1;dr++){ for(let dc=-1;dc<=1;dc++){ const nr=r+dr,nc=c+dc; if(nr<0||nc<0||nr>=rows||nc>=cols) continue; if(!grid[nr][nc].revealed) revealCell(nr,nc); } } }
}

function numberColor(n){ const colors=['#1e90ff','#10b981','#f59e0b','#ef4444','#7c3aed','#db2777','#14b8a6','#64748b']; return colors[(n-1)%colors.length]; }
function getCellEl(r,c){ const gridEl=gridContainer.querySelector('.grid'); return gridEl.children[r*cols+c]; }
function startTimer(){ timerInterval=setInterval(()=>{ timeElapsed++; timerEl.textContent=timeElapsed; },1000); }
function loseGame(){ gameOver=true; clearInterval(timerInterval); revealAllMines(); messageEl.style.color='var(--muted)'; messageEl.textContent='You hit a mine — game over!'; saveLastScore(0,false); }
function revealAllMines(){ for(let r=0;r<rows;r++){ for(let c=0;c<cols;c++){ if(grid[r][c].mine){ const el=getCellEl(r,c); el.classList.remove('hidden'); el.classList.add('revealed','mine'); el.textContent='💣'; } } } }
function checkWin(){ const totalSafe=rows*cols-mines; if(revealedCount>=totalSafe){ gameOver=true; clearInterval(timerInterval); messageEl.style.color='var(--success)'; messageEl.textContent='You cleared the board — you win!'; const score=computeScore(); saveLastScore(score,true); } }
function computeScore(){ const diff=diffSelect.value; const mult=presets[diff]?.mult||1; const base=(rows*cols-mines)*50; const timeFactor=Math.max(1,1+(300-timeElapsed)/300); return Math.round(base*mult*timeFactor); }

async function renderRemoteLeaderboard() {
  try {
    const snapshot = await db.ref('scores').once('value');
    const data = snapshot.val() ? Object.values(snapshot.val()) : [];
    const ol = document.createElement('ol');
    data.sort((a,b)=>b.score-a.score); // highest first
    data.forEach(it => {
      const li = document.createElement('li');
      li.textContent = `${it.name} — ${it.score} pts — ${it.difficulty} — ${new Date(it.date).toLocaleString()}`;
      ol.appendChild(li);
    });
    leaderboardEl.innerHTML = '';
    leaderboardEl.appendChild(ol);
  } catch (e) {
    leaderboardEl.innerHTML = '<div style="color:var(--muted)">Unable to load leaderboard.</div>';
    console.error(e);
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
  lastScoreEl.textContent = score + (won ? ' (win)' : ' (loss)');
    try {
      await db.ref('scores').push(entry); // Save to Firebase
      renderRemoteLeaderboard();
    } catch (e) {
      console.error('Failed to save score', e);
    }
}

document.addEventListener('DOMContentLoaded',()=>{
  gridContainer = document.getElementById('gridContainer');
  minesLeftEl = document.getElementById('minesLeft');
  timerEl = document.getElementById('timer');
  messageEl = document.getElementById('message');
  startBtn = document.getElementById('startBtn');
  diffSelect = document.getElementById('difficulty');
  playerNameInput = document.getElementById('playerName');
  lastScoreEl = document.getElementById('lastScore');
  leaderboardEl = document.getElementById('leaderboard');

  startBtn.addEventListener('click', ()=>startGame());
  diffSelect.addEventListener('change', ()=>{ setDifficultyFromSelect(); startGame(); });
  document.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='r') startGame(); });

  setDifficultyFromSelect();
  startGame();
  renderRemoteLeaderboard();
});
