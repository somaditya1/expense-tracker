import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { User, Expense, Session } from './models.js';
import { hashPassword, verifyPassword, tokenHash } from './passwords.js';
import { InputError, expenseInput, toCents } from '../shared/domain.js';

const publicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  budgetCents: user.budgetCents,
});
const publicExpense = (e) => ({
  id: String(e._id),
  description: e.description,
  amountCents: e.amountCents,
  category: e.category,
  date: e.date,
  note: e.note,
});

export function createApp({
  production = process.env.NODE_ENV === 'production',
  origin = process.env.APP_ORIGIN || 'http://localhost:5173',
  limit = true,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Set only when the deployment is behind exactly one trusted reverse proxy.
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: production ? [] : null },
      },
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, res, next) => {
    if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.get('origin') && req.get('origin') !== origin)
        return res
          .status(403)
          .json({ error: 'Request origin is not allowed.' });
      if (!req.is('application/json'))
        return res.status(415).json({ error: 'Send application/json.' });
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
        return res.status(400).json({ error: 'Send a JSON object.' });
    }
    next();
  });
  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: 'strict',
    path: '/',
  };
  async function openSession(user, res) {
    const token = randomBytes(32).toString('hex');
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    await Session.create({
      tokenHash: tokenHash(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + maxAge),
    });
    res.cookie('session', token, { ...cookieOptions, maxAge });
  }
  if (limit)
    app.use(
      '/api/auth',
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 40,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Too many requests. Try again in 15 minutes.' },
      }),
    );

  app.get('/api/health', (_req, res) =>
    res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
      status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable',
    }),
  );
  app.post('/api/auth/register', async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email =
      typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password = req.body.password;
    if (!name || name.length > 80)
      throw new InputError('Name must contain 1–80 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new InputError('Enter a valid email address.');
    if (
      typeof password !== 'string' ||
      password.length < 10 ||
      password.length > 128
    )
      throw new InputError('Password must contain 10–128 characters.');
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
    });
    await openSession(user, res);
    res.status(201).json({ user: publicUser(user) });
  });
  app.post('/api/auth/login', async (req, res) => {
    const email =
      typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password = req.body.password;
    if (typeof password !== 'string' || password.length > 128)
      return res.status(401).json({ error: 'Invalid email or password.' });
    const user = await User.findOne({ email }).select('+passwordHash');
    // Perform scrypt for missing users too, reducing the obvious timing difference.
    const fallback = '0'.repeat(32) + ':' + '0'.repeat(128);
    const valid = await verifyPassword(
      password,
      user?.passwordHash || fallback,
    );
    if (!user || !valid)
      return res.status(401).json({ error: 'Invalid email or password.' });
    if (req.cookies.session)
      await Session.deleteOne({ tokenHash: tokenHash(req.cookies.session) });
    await openSession(user, res);
    res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', async (req, res) => {
    if (req.cookies.session)
      await Session.deleteOne({ tokenHash: tokenHash(req.cookies.session) });
    res.clearCookie('session', cookieOptions).json({ ok: true });
  });
  app.use('/api', async (req, res, next) => {
    const token = req.cookies.session;
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      return res.status(401).json({ error: 'Sign in to continue.' });
    const session = await Session.findOne({
      tokenHash: tokenHash(token),
      expiresAt: { $gt: new Date() },
    });
    const user = session && (await User.findById(session.userId));
    if (!user)
      return res
        .status(401)
        .json({ error: 'Your session has expired. Sign in again.' });
    req.user = user;
    next();
  });
  app.get('/api/auth/me', (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );
  app.patch('/api/budget', async (req, res) => {
    req.user.budgetCents = toCents(req.body.amount, { allowZero: true });
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  });
  app.get('/api/expenses', async (req, res) => {
    const expenses = await Expense.find({ userId: req.user._id })
      .sort({ date: -1, createdAt: -1 })
      .lean();
    res.json({ expenses: expenses.map(publicExpense) });
  });
  app.post('/api/expenses', async (req, res) => {
    const expense = await Expense.create({
      ...expenseInput(req.body),
      userId: req.user._id,
    });
    res.status(201).json({ expense: publicExpense(expense) });
  });
  app.patch('/api/expenses/:id', async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id))
      throw new InputError('Invalid expense ID.');
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: expenseInput(req.body) },
      { returnDocument: 'after', runValidators: true },
    );
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ expense: publicExpense(expense) });
  });
  app.delete('/api/expenses/:id', async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id))
      throw new InputError('Invalid expense ID.');
    const result = await Expense.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!result.deletedCount)
      return res.status(404).json({ error: 'Expense not found.' });
    res.status(204).end();
  });
  app.use('/api', (_req, res) =>
    res.status(404).json({ error: 'Endpoint not found.' }),
  );
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  if (existsSync(`${dist}/index.html`)) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
  }
  app.use((err, _req, res, _next) => {
    if (err instanceof InputError || err.type === 'entity.parse.failed')
      return res.status(400).json({
        error: err instanceof InputError ? err.message : 'Invalid JSON.',
      });
    if (err.type === 'entity.too.large')
      return res.status(413).json({ error: 'Request is too large.' });
    if (err.code === 11000)
      return res
        .status(409)
        .json({ error: 'An account with this email already exists.' });
    console.error('Request failed:', err.name);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
