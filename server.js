const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'leaderboard.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure data folder and file exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([
    { id: 1, name: "Ghost-Actual", wave: 8, kills: 74, survivalTime: 395, date: "2026-09-17" },
    { id: 2, name: "Sgt. Vance", wave: 6, kills: 51, survivalTime: 288, date: "2026-09-17" },
    { id: 3, name: "Recon-9", wave: 4, kills: 32, survivalTime: 190, date: "2026-09-17" }
  ], null, 2));
}

function getLeaderboard() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveScore(entry) {
  try {
    const scores = getLeaderboard();
    const newEntry = {
      id: Date.now(),
      name: (entry.name || 'Operative').substring(0, 16),
      wave: Number(entry.wave) || 1,
      kills: Number(entry.kills) || 0,
      survivalTime: Math.round(Number(entry.survivalTime) || 0),
      date: new Date().toISOString().split('T')[0]
    };
    scores.push(newEntry);
    scores.sort((a, b) => b.wave - a.wave || b.kills - a.kills || b.survivalTime - a.survivalTime);
    const topScores = scores.slice(0, 10);
    fs.writeFileSync(DATA_FILE, JSON.stringify(topScores, null, 2));
    return topScores;
  } catch (e) {
    console.error("Failed to save score:", e);
    return getLeaderboard();
  }
}

// Try using Express if available; otherwise use built-in HTTP server
let app;
try {
  const express = require('express');
  const cors = require('cors');
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/leaderboard', (req, res) => {
    res.json(getLeaderboard());
  });

  app.post('/api/score', (req, res) => {
    const updated = saveScore(req.body);
    res.json({ success: true, leaderboard: updated });
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  OUTLAST: SECTOR ZERO — TACTICAL COMBAT SERVER`);
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
} catch (err) {
  // Graceful fallback to built-in HTTP server (requires 0 external npm packages)
  console.log("Express not yet installed. Running built-in zero-dependency HTTP server...");
  const http = require('http');

  const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/api/leaderboard' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getLeaderboard()));
      return;
    }

    if (req.url === '/api/score' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const updated = saveScore(parsed);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, leaderboard: updated }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // Static file serving
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  OUTLAST: SECTOR ZERO — TACTICAL COMBAT SERVER (HTTP)`);
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}
