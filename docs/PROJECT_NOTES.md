# Project evidence and interview notes

This implementation expands a repository that originally contained only a
two-line README. The original July 2025 commit does not prove that this source
code existed then. Use the implementation commit dates when describing its
development history.

## What to demonstrate

1. Create a new account and explain the same-origin cookie session.
2. Add an expense, refresh, and show MongoDB persistence.
3. Edit/delete the expense and show the validation errors for invalid inputs.
4. Set a budget, choose a month, and explain category totals versus table filters.
5. Show the account-isolation test and the CI workflow.
6. Explain why money uses integer cents and what would change for large datasets.

## Resume wording supported by the implementation

- Built a React and Express expense tracker backed by MongoDB, with account
  sessions, private expense management, monthly budgets, and CSV export.
- Added automated API and browser tests covering expense persistence,
  account isolation, validation, and the complete signup-to-export workflow.

Use these only after reviewing and understanding the implementation. Be clear
about AI assistance if asked. Do not claim user adoption, measured cost or
performance improvements, bank integration, or a live deployment without
additional evidence.

## Next improvements

- Deploy and record a verified public demo URL.
- Add password reset and email verification.
- Add server-side pagination/aggregation for larger datasets.
- Add budgets stored separately for each month, if users need historical targets.
- Add an automated accessibility audit and broader browser coverage.
- Add an operational backup and monitoring plan before using real financial records.
