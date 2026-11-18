const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only these files are served; anything else in the folder (.env, .private/,
// .git/, subscribers.json, node_modules/, the server's own source) gets a 404.
// .image-slots.state.json is the one hidden file the page needs: image-slot.js
// fetches it for the hero image.
const PUBLIC_FILES = new Set([
  'The Stronghold.dc.html',
  'index.html',
  'support.js',
  'image-slot.js',
  '.image-slots.state.json',
  'Bird Formation.png',
  'The Stronghold screenshot.webp',
]);
const serveStatic = express.static(__dirname, { dotfiles: 'allow', index: false, redirect: false });

function isPublicFile(urlPath) {
  try {
    return PUBLIC_FILES.has(decodeURIComponent(urlPath).slice(1));
  } catch {
    return false;
  }
}

app.use(express.json());
app.use((req, res, next) => (isPublicFile(req.path) ? serveStatic(req, res, next) : next()));

async function readSubscribers() {
  try {
    return JSON.parse(await fs.readFile(SUBSCRIBERS_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

app.post('/api/subscribe', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const subscribers = await readSubscribers();
  if (!subscribers.some((s) => s.email === email)) {
    subscribers.push({ email, subscribedAt: new Date().toISOString() });
    await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
  }

  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'The Stronghold.dc.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
