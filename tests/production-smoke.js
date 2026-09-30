import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Exercise the real production entry point and built static assets, not a mock.
const mongo = await MongoMemoryServer.create();
let child;
try {
  child = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      MONGODB_URI: mongo.getUri(),
      PORT: '3002',
      APP_ORIGIN: 'https://expenses.example.com',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk;
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${logs}`);
    try {
      const r = await fetch('http://127.0.0.1:3002/api/health');
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Server did not become ready: ${logs}`);
  const page = await fetch('http://127.0.0.1:3002/');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes('Expense Tracker'));
  const asset = html.match(/src="([^\"]+\.js)"/)[1];
  assert.equal((await fetch(`http://127.0.0.1:3002${asset}`)).status, 200);
  const registration = await fetch('http://127.0.0.1:3002/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke test',
      email: 'smoke@example.com',
      password: 'test-password-123',
    }),
  });
  assert.equal(registration.status, 201);
  assert.match(registration.headers.get('set-cookie'), /Secure/);
  assert.equal((await fetch('http://127.0.0.1:3002/api/expenses')).status, 401);
  console.log(
    'Production startup, database readiness, static assets, registration, and Secure cookies verified.',
  );
} finally {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  await mongo.stop();
}
