import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('account, expense CRUD, budget, filters, export, persistence, and logout', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Soma');
  await page.getByLabel('Email address').fill('browser@example.com');
  await page.getByLabel('Password').fill('long-password-123');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your money, at a glance.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByLabel('Description', { exact: true }).fill('Campus coffee');
  await page.getByLabel('Amount (USD)').fill('4.29');
  await page.getByLabel('Date', { exact: true }).fill('2026-09-29');
  await page.getByRole('button', { name: 'Save expense' }).click();
  await page.getByLabel('Month', { exact: true }).fill('2026-09');
  await expect(page.getByText('Campus coffee', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Month', { exact: true }).fill('2026-09');
  await expect(page.getByText('Campus coffee', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit monthly budget' }).click();
  await page.getByLabel('Monthly budget (USD)').fill('1000');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByText('$995.71', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Campus coffee' }).click();
  await page.getByLabel('Description', { exact: true }).fill('Campus tea');
  await page.getByLabel('Amount (USD)').fill('3.25');
  await page.getByRole('button', { name: 'Save expense' }).click();
  await expect(page.getByText('Campus tea', { exact: true })).toBeVisible();
  await page.getByLabel('Search expenses').fill('missing');
  await expect(page.getByText('No matching expenses.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Filter by category').selectOption('Shopping');
  await expect(page.getByText('No matching expenses.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    'expenses-2026-09.csv',
  );
  await page.getByRole('button', { name: 'Delete Campus tea' }).click();
  await page
    .getByRole('button', { name: 'Delete expense', exact: true })
    .click();
  await expect(page.getByText('A fresh page for your spending.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('heading', { name: 'Good to see you again.' }),
  ).toBeVisible();
  await page.getByLabel('Email address').fill('browser@example.com');
  await page.getByLabel('Password').fill('long-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your money, at a glance.' }),
  ).toBeVisible();
});

test('responsive layout, keyboard dialog, and genuine screenshots', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Soma');
  await page.getByLabel('Email address').fill('screenshots@example.com');
  await page.getByLabel('Password').fill('long-password-123');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your money, at a glance.' }),
  ).toBeVisible();
  const date = new Date();
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  // Seed this disposable test account through the actual authenticated API.
  await page.evaluate(
    async ({ month }) => {
      for (const [description, amount, category, day, note] of [
        [
          'Weekly groceries',
          '68.42',
          'Groceries',
          '24',
          'A stocked fridge for the week',
        ],
        ['Coffee with a friend', '8.50', 'Food & drink', '23', ''],
        ['Bus pass', '35.00', 'Transport', '21', ''],
        ['Dinner on State Street', '24.75', 'Food & drink', '20', ''],
        ['Running shoes', '89.99', 'Shopping', '18', ''],
        ['Movie night', '16.00', 'Entertainment', '16', ''],
      ]) {
        const r = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            amount,
            category,
            date: `${month}-${day}`,
            note,
          }),
        });
        if (!r.ok) throw new Error('Seed failed');
      }
      await fetch('/api/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: '1000' }),
      });
    },
    { month },
  );
  await page.reload();
  await expect(page.getByText('Bus pass', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.evaluate(() => document.fonts.ready);
  await mkdir('docs', { recursive: true });
  await page.screenshot({ path: 'docs/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/dashboard-mobile.png', fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Description', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
