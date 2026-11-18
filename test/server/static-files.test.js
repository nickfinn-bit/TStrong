// What server.js serves from its folder: the page's public files, and nothing
// else (no .env, .private/, subscribers list, .git/, source or node_modules).
// Runs a copy of server.js in a temporary folder seeded with stand-in secrets,
// so the real .env and sign-ups are never read or written.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const PUBLIC_FILES = [
  'The Stronghold.dc.html',
  'index.html',
  'support.js',
  'image-slot.js',
  '.image-slots.state.json',
  'Bird Formation.png',
  'The Stronghold screenshot.webp',
];
const SECRET = 'stand-in-secret-7f3a';
const BLOCKED_PATHS = [
  '/.env',
  '/.ENV',
  '/%2eenv',
  '/%2Eenv',
  '/.%65nv',
  '/%252eenv',
  '/x/../.env',
  '/x/%2e%2e/.env',
  '/..%2f.env',
  '/.env/',
  '/.private/',
  '/.private',
  '/.private/notes.md',
  '/%2eprivate/notes.md',
  '/subscribers.json',
  '/data/subscribers.json',
  '/.git/config',
  '/server.js',
  '/package.json',
  '/INDEX.md',
  '/node_modules/stand-in-pkg/package.json',
  '/support.js/',
  '/support.js/../.env',
];

let site;
const servers = [];

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    // No host: probe all interfaces, the way server.js listens.
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer(env) {
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: site,
    env: { ...process.env, ...env, PORT: String(port), NODE_PATH: path.join(REPO, 'node_modules') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servers.push(child);
  await new Promise((resolve, reject) => {
    let err = '';
    const timer = setTimeout(() => reject(new Error(`server.js did not log "Listening on" in 10 s: ${err}`)), 10000);
    child.stdout.on('data', (d) => { if (String(d).includes('Listening on')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', (d) => { err += d; });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`server.js exited ${code}: ${err}`)); });
  });
  return port;
}

// Sends the path exactly as written (no client-side normalising of .. or %2e).
function get(port, rawPath, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: rawPath, method, headers: body ? { 'content-type': 'application/json' } : {} },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

const urlFor = (name) => '/' + encodeURIComponent(name);

before(async () => {
  site = fs.mkdtempSync(path.join(os.tmpdir(), 'tstrong-static-'));
  for (const f of [...PUBLIC_FILES, 'server.js', 'package.json', 'INDEX.md']) {
    fs.copyFileSync(path.join(REPO, f), path.join(site, f));
  }
  fs.writeFileSync(path.join(site, '.env'), `RAILWAY_TOKEN=${SECRET}\n`);
  fs.mkdirSync(path.join(site, '.private'));
  fs.writeFileSync(path.join(site, '.private', 'notes.md'), SECRET);
  fs.mkdirSync(path.join(site, '.git'));
  fs.writeFileSync(path.join(site, '.git', 'config'), SECRET);
  // Not named express: server.js must still load the real one through NODE_PATH.
  fs.mkdirSync(path.join(site, 'node_modules', 'stand-in-pkg'), { recursive: true });
  fs.writeFileSync(path.join(site, 'node_modules', 'stand-in-pkg', 'package.json'), SECRET);
  const list = JSON.stringify([{ email: `${SECRET}@example.com`, subscribedAt: '2026-01-01T00:00:00.000Z' }]);
  fs.writeFileSync(path.join(site, 'subscribers.json'), list);
  fs.mkdirSync(path.join(site, 'data'));
  fs.writeFileSync(path.join(site, 'data', 'subscribers.json'), list);
});

// Each server's cwd is the temp folder, so Windows can only delete it once
// they have exited.
after(async () => {
  await Promise.all(servers.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  })));
  fs.rmSync(site, { recursive: true, force: true, maxRetries: 5 });
});

test('static files, sign-ups in the folder (no volume)', async (t) => {
  const port = await startServer({ RAILWAY_VOLUME_MOUNT_PATH: '' });

  for (const name of PUBLIC_FILES) {
    await t.test(`serves ${name} unchanged`, async () => {
      const res = await get(port, urlFor(name));
      assert.equal(res.status, 200);
      assert.ok(res.body.equals(fs.readFileSync(path.join(REPO, name))));
    });
  }

  await t.test('serves the landing page at /', async () => {
    const res = await get(port, '/');
    assert.equal(res.status, 200);
    assert.ok(res.body.equals(fs.readFileSync(path.join(REPO, 'The Stronghold.dc.html'))));
  });

  for (const p of BLOCKED_PATHS) {
    await t.test(`does not serve ${p}`, async () => {
      const res = await get(port, p);
      assert.equal(res.status, 404);
      assert.ok(!res.body.includes(SECRET));
    });
  }

  await t.test('a sign-up is saved and the list stays unserved', async () => {
    const res = await get(port, '/api/subscribe', 'POST', JSON.stringify({ email: 'New@Example.com' }));
    assert.equal(res.status, 200);
    const saved = JSON.parse(fs.readFileSync(path.join(site, 'subscribers.json'), 'utf8'));
    assert.ok(saved.some((s) => s.email === 'new@example.com'));
    assert.equal((await get(port, '/subscribers.json')).status, 404);
  });
});

test('static files, sign-ups on a volume inside the folder', async (t) => {
  const port = await startServer({ RAILWAY_VOLUME_MOUNT_PATH: path.join(site, 'data') });

  await t.test('a sign-up is saved to the volume and the list stays unserved', async () => {
    const res = await get(port, '/api/subscribe', 'POST', JSON.stringify({ email: 'vol@example.com' }));
    assert.equal(res.status, 200);
    const saved = JSON.parse(fs.readFileSync(path.join(site, 'data', 'subscribers.json'), 'utf8'));
    assert.ok(saved.some((s) => s.email === 'vol@example.com'));
    const served = await get(port, '/data/subscribers.json');
    assert.equal(served.status, 404);
    assert.ok(!served.body.includes(SECRET));
  });
});
