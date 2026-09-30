import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/app.js';
import { User, Expense, Session } from '../server/models.js';

let mongo;
const app = createApp({ production: false, limit: false });
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Expense.init(), Session.init()]);
});
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Expense.deleteMany({}),
    Session.deleteMany({}),
  ]);
});
const expense = {
  description: 'Coffee',
  amount: '4.29',
  date: '2026-09-29',
  category: 'Food & drink',
  note: 'Campus',
};
async function account(email = 'soma@example.com') {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Soma', email, password: 'long-password-123' })
    .expect(201);
  return agent;
}

test('registration stores a password hash and hashed session; login returns private cookie', async () => {
  const agent = await account();
  const user = await User.findOne().select('+passwordHash');
  assert.notEqual(user.passwordHash, 'long-password-123');
  const login = await agent
    .post('/api/auth/login')
    .send({ email: 'SOMA@EXAMPLE.COM', password: 'long-password-123' })
    .expect(200);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);
  assert.match(login.headers['set-cookie'][0], /SameSite=Strict/);
  assert.equal(login.body.user.passwordHash, undefined);
  const rawToken = login.headers['set-cookie'][0].match(/session=([^;]+)/)[1];
  const sessions = await Session.find();
  assert.ok(sessions.every((s) => s.tokenHash !== rawToken));
  assert.equal(sessions.length, 1);
  await agent.get('/api/auth/me').expect(200);
  await agent
    .post('/api/auth/login')
    .send({ email: 'soma@example.com', password: 'wrong' })
    .expect(401);
});
test('registration rejects duplicate and invalid credentials', async () => {
  await account();
  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Soma',
      email: 'soma@example.com',
      password: 'long-password-123',
    })
    .expect(409);
  for (const body of [
    { name: '', email: 'a@b.com', password: '1234567890' },
    { name: 'a', email: 'bad', password: '1234567890' },
    { name: 'a', email: 'a@b.com', password: 'short' },
  ])
    await request(app).post('/api/auth/register').send(body).expect(400);
});
test('CRUD persists across sessions and rounds no cents', async () => {
  const agent = await account();
  const created = await agent.post('/api/expenses').send(expense).expect(201);
  assert.equal(created.body.expense.amountCents, 429);
  const id = created.body.expense.id;
  const anotherSession = request.agent(app);
  await anotherSession
    .post('/api/auth/login')
    .send({ email: 'soma@example.com', password: 'long-password-123' })
    .expect(200);
  assert.equal(
    (await anotherSession.get('/api/expenses').expect(200)).body.expenses[0].id,
    id,
  );
  const changed = await agent
    .patch(`/api/expenses/${id}`)
    .send({ ...expense, amount: '0.29', description: 'Tea' })
    .expect(200);
  assert.equal(changed.body.expense.amountCents, 29);
  assert.equal((await Expense.findById(id)).description, 'Tea');
  await agent.delete(`/api/expenses/${id}`).send({}).expect(204);
  assert.equal(await Expense.countDocuments(), 0);
  await agent.delete(`/api/expenses/${id}`).send({}).expect(404);
});
test('a second user cannot list, edit, or delete the first user’s expenses', async () => {
  const first = await account('first@example.com');
  const second = await account('second@example.com');
  const id = (await first.post('/api/expenses').send(expense).expect(201)).body
    .expense.id;
  assert.deepEqual(
    (await second.get('/api/expenses').expect(200)).body.expenses,
    [],
  );
  await second
    .patch(`/api/expenses/${id}`)
    .send({ ...expense, amount: '1' })
    .expect(404);
  await second.delete(`/api/expenses/${id}`).send({}).expect(404);
  assert.equal((await Expense.findById(id)).amountCents, 429);
  const firstId = (await User.findOne({ email: 'first@example.com' })).id;
  const created = await second
    .post('/api/expenses')
    .send({ ...expense, userId: firstId })
    .expect(201);
  assert.notEqual(
    String((await Expense.findById(created.body.expense.id)).userId),
    firstId,
  );
});
test('invalid expenses and identifiers are rejected without writes', async () => {
  const agent = await account();
  for (const patch of [
    { amount: '-1' },
    { amount: '0' },
    { amount: '4.001' },
    { date: '2026-02-30' },
    { description: '' },
    { category: 'Missing' },
    { note: 'x'.repeat(501) },
  ])
    await agent
      .post('/api/expenses')
      .send({ ...expense, ...patch })
      .expect(400);
  await agent.patch('/api/expenses/bad-id').send(expense).expect(400);
  await agent
    .patch('/api/expenses/000000000000000000000000')
    .send(expense)
    .expect(404);
  assert.equal(await Expense.countDocuments(), 0);
});
test('budget is persisted and scoped to the user', async () => {
  const agent = await account();
  const other = await account('other@example.com');
  const updated = await agent
    .patch('/api/budget')
    .send({ amount: '1500.25' })
    .expect(200);
  assert.equal(updated.body.user.budgetCents, 150025);
  assert.equal((await agent.get('/api/auth/me')).body.user.budgetCents, 150025);
  assert.equal((await other.get('/api/auth/me')).body.user.budgetCents, 0);
  await agent.patch('/api/budget').send({ amount: '0' }).expect(200);
  await agent.patch('/api/budget').send({ amount: '-2' }).expect(400);
});
test('logout and expiration revoke access', async () => {
  const agent = await account();
  await agent.post('/api/auth/logout').send({}).expect(200);
  await agent.get('/api/expenses').expect(401);
  assert.equal(await Session.countDocuments(), 0);
  await agent
    .post('/api/auth/login')
    .send({ email: 'soma@example.com', password: 'long-password-123' })
    .expect(200);
  await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
  await agent.get('/api/auth/me').expect(401);
});
test('unauthenticated access, cross-origin writes, and non-JSON writes are rejected', async () => {
  await request(app).get('/api/expenses').expect(401);
  await request(app).post('/api/expenses').send(expense).expect(401);
  const agent = await account();
  await agent
    .post('/api/expenses')
    .set('Origin', 'https://evil.example')
    .send(expense)
    .expect(403);
  await agent.post('/api/expenses').type('form').send(expense).expect(415);
  await agent
    .post('/api/expenses')
    .set('Content-Type', 'application/json')
    .send('{')
    .expect(400);
  await agent.post('/api/expenses').send([]).expect(400);
  await agent
    .post('/api/expenses')
    .set('Origin', 'http://localhost:5173')
    .send(expense)
    .expect(201);
});
test('health reports database readiness and production cookies are secure', async () => {
  await request(app).get('/api/health').expect(200);
  const production = createApp({
    production: true,
    origin: 'https://expenses.example.com',
    limit: false,
  });
  const result = await request(production)
    .post('/api/auth/register')
    .send({
      name: 'Production',
      email: 'production@example.com',
      password: 'long-password-123',
    })
    .expect(201);
  assert.match(result.headers['set-cookie'][0], /Secure/);
  assert.equal(result.headers['x-powered-by'], undefined);
});
test('authentication rate limiting is active', async () => {
  const limited = createApp();
  for (let i = 0; i < 40; i++)
    await request(limited).get('/api/auth/me').expect(401);
  const result = await request(limited).get('/api/auth/me').expect(429);
  assert.ok(result.body.error.includes('Too many requests'));
});
