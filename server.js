const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(express.json());
app.use(express.static(__dirname, { dotfiles: 'allow', index: false }));

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
