import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    budgetCents: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    description: { type: String, required: true },
    amountCents: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);
expenseSchema.index({ userId: 1, date: -1 });

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const User = mongoose.model('User', userSchema);
export const Expense = mongoose.model('Expense', expenseSchema);
export const Session = mongoose.model('Session', sessionSchema);
