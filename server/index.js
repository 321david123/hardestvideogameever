/**
 * Global scoreboard API - one shared prize pool for everyone.
 * GET /api/scoreboard -> current { attempts, prizePool }
 * POST /api/scoreboard/attempt -> increment by one try (+$2.50), return new values
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.SCOREBOARD_PORT || 3001;
const PRIZE_INCREMENT = 2.5;
const INITIAL_PRIZE = 1000;

// Use /data on Fly.io (persistent volume); otherwise local file
const dataPath = process.env.SCOREBOARD_DATA_PATH || join(__dirname, 'scoreboard.json');

function readData() {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(raw);
    if (typeof data.attempts !== 'number' || typeof data.prizePool !== 'number') {
      return { attempts: 0, prizePool: INITIAL_PRIZE };
    }
    return data;
  } catch {
    return { attempts: 0, prizePool: INITIAL_PRIZE };
  }
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

const app = express();
app.use(express.json());

app.get('/api/scoreboard', (req, res) => {
  const data = readData();
  res.json({ attempts: data.attempts, prizePool: data.prizePool });
});

app.post('/api/scoreboard/attempt', (req, res) => {
  const data = readData();
  data.attempts += 1;
  data.prizePool = Math.round((data.prizePool + PRIZE_INCREMENT) * 100) / 100;
  writeData(data);
  res.json({ attempts: data.attempts, prizePool: data.prizePool });
});

// Optional: serve built game in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scoreboard API on http://0.0.0.0:${PORT}`);
  if (isProduction) console.log('Serving static from dist');
});
