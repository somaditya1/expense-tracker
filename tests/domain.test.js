import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCents,
  validDate,
  expenseInput,
  summarize,
  csv,
} from '../shared/domain.js';

test('money is converted exactly and rejects invalid precision and ranges', () => {
  assert.equal(toCents('0.29'), 29);
  assert.equal(toCents('12.3'), 1230);
  assert.equal(toCents('1000000'), 100000000);
  assert.equal(toCents('0', { allowZero: true }), 0);
  for (const value of [
    '0',
    '-1',
    '1.001',
    '1e3',
    '',
    'NaN',
    '1000000.01',
    null,
  ])
    assert.throws(() => toCents(value));
});
test('dates reject normalized calendar errors', () => {
  assert.equal(validDate('2024-02-29'), true);
  for (const value of [
    '2025-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-1-1',
    '1899-12-31',
    null,
  ])
    assert.equal(validDate(value), false);
});
test('expense validation normalizes text and ignores ownership from input', () => {
  const result = expenseInput({
    description: ' Coffee ',
    amount: '4.25',
    date: '2026-09-29',
    category: 'Food & drink',
    note: ' hi ',
    userId: 'attacker',
  });
  assert.deepEqual(result, {
    description: 'Coffee',
    amountCents: 425,
    date: '2026-09-29',
    category: 'Food & drink',
    note: 'hi',
  });
  assert.throws(() =>
    expenseInput({
      description: 'a',
      amount: '1',
      date: '2026-09-29',
      category: 'Invalid',
    }),
  );
});
test('summaries use integer cents and deterministic category totals', () => {
  const result = summarize([
    { amountCents: 29, category: 'Other' },
    { amountCents: 31, category: 'Other' },
    { amountCents: 100, category: 'Groceries' },
  ]);
  assert.equal(result.totalCents, 160);
  assert.equal(result.count, 3);
  assert.deepEqual(result.byCategory, [
    { category: 'Groceries', amountCents: 100 },
    { category: 'Other', amountCents: 60 },
  ]);
  assert.equal(summarize([]).totalCents, 0);
});
test('CSV escapes quotes, newlines, and formula prefixes', () => {
  const result = csv([
    {
      date: '2026-09-29',
      description: ' =SUM(1,2)',
      category: 'Other',
      amountCents: 29,
      note: 'a"b\nc',
    },
  ]);
  assert.ok(result.includes('"\' =SUM(1,2)"'));
  assert.ok(result.includes('"a""b\nc"'));
  assert.ok(result.includes('"0.29"'));
});
