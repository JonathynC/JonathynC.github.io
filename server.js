import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const SCORES_FILE = './scores.json';

// Load existing scores or initialize empty array
let scores = [];
if (fs.existsSync(SCORES_FILE)) {
  scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
}

// Handle GET leaderboard
app.get('/scores', (req, res) => {
  res.json(scores.slice(0, 50));
});

// Handle POST new score
app.post('/scores', (req, res) => {
  const entry = req.body;
  if (!entry.name || !entry.score) {
    return res.status(400).json({ error: 'Invalid score entry' });
  }
  entry.date = new Date().toISOString();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 50);
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Leaderboard server running on port ${PORT}`));
