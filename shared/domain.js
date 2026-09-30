export const CATEGORIES = [
  'Food & drink',
  'Groceries',
  'Transport',
  'Shopping',
  'Housing',
  'Health',
  'Entertainment',
  'Other',
];

export class InputError extends Error {}

// Convert decimal input to integer cents without floating-point multiplication.
export function toCents(value, { allowZero = false } = {}) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text))
    throw new InputError('Enter an amount with at most two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if ((!allowZero && cents === 0) || cents > 100000000)
    throw new InputError(
      'Amount must be greater than $0 and at most $1,000,000.',
    );
  return cents;
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' &&
    value <= '2100-12-31'
  );
}

export function expenseInput(body) {
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  if (!description || description.length > 120)
    throw new InputError('Description must contain 1–120 characters.');
  if (!CATEGORIES.includes(body.category))
    throw new InputError('Choose a valid category.');
  if (!validDate(body.date))
    throw new InputError('Enter a valid date between 1900 and 2100.');
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > 500)
    throw new InputError('Notes must be at most 500 characters.');
  return {
    description,
    category: body.category,
    date: body.date,
    note,
    amountCents: toCents(body.amount),
  };
}

export function summarize(expenses) {
  const byCategory = CATEGORIES.map((category) => ({
    category,
    amountCents: expenses
      .filter((e) => e.category === category)
      .reduce((sum, e) => sum + e.amountCents, 0),
  }))
    .filter((e) => e.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);
  return {
    totalCents: expenses.reduce((sum, e) => sum + e.amountCents, 0),
    count: expenses.length,
    byCategory,
  };
}

export function csv(expenses) {
  // Prevent spreadsheet formula execution, including after leading whitespace.
  const escape = (value) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    'Date,Description,Category,Amount (USD),Note',
    ...expenses.map((e) =>
      [
        e.date,
        e.description,
        e.category,
        (e.amountCents / 100).toFixed(2),
        e.note,
      ]
        .map(escape)
        .join(','),
    ),
  ].join('\r\n');
}
