import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { User, Expense, Session } from './models.js';

if (!process.env.MONGODB_URI)
  throw new Error(
    'MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.',
  );
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.APP_ORIGIN?.startsWith('https://')
)
  throw new Error('Production requires APP_ORIGIN with an HTTPS URL.');
await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
});
await Promise.all([User.init(), Expense.init(), Session.init()]);
const server = createApp().listen(
  Number(process.env.PORT || 3001),
  '0.0.0.0',
  () =>
    console.log(
      `Expense Tracker listening on port ${process.env.PORT || 3001}`,
    ),
);
async function shutdown() {
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
