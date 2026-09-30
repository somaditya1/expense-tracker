import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/app.js';
import { User, Expense, Session } from '../server/models.js';
// Isolated, disposable MongoDB for browser checks; never uses real account data.
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri());
await Promise.all([User.init(), Expense.init(), Session.init()]);
const server = createApp({ production: false, limit: false }).listen(
  3001,
  '127.0.0.1',
);
async function stop() {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
