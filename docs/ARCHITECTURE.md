# Architecture and decisions

## Request flow

React in `client/src/main.jsx` calls relative `/api` paths. Vite proxies these
requests to Express during development. In production, Express serves the
compiled frontend and the API from the same origin. Mongoose accesses MongoDB.

- `server/app.js`: HTTP middleware, authentication, validation, and routes.
- `server/models.js`: users, expenses, and session schemas/indexes.
- `server/passwords.js`: password hashing and session token hashing.
- `shared/domain.js`: exact cent parsing, date checks, summaries, and CSV encoding.
- `server/index.js`: startup, database readiness, indexes, and graceful shutdown.

## Why integer cents?

Amounts and budgets are stored as integer cents. Decimal strings are parsed
directly, so `0.29` becomes `29` without floating-point multiplication.
The UI formats cents as USD. Inputs accept at most two decimal places and
at most $1,000,000 per expense or monthly budget. Zero is allowed only for
removing the budget. The application supports USD only.

## Why opaque cookie sessions?

Random 256-bit tokens identify seven-day sessions. Only their SHA-256 hashes
are stored in MongoDB. Cookies are HttpOnly and SameSite=Strict, and Secure in
production. Logout deletes the session. Requests check expiration explicitly;
MongoDB's TTL index eventually cleans up expired records. Passwords use scrypt
with random per-password salts and constant-time hash comparisons.

This avoids storing bearer credentials in browser localStorage. Browser
mutations require JSON and reject a supplied Origin that differs from
APP_ORIGIN. Requests without Origin support command-line API clients.
The server does not enable cross-origin credentialed access.

## Ownership at the database query

Every expense list, update, and delete is scoped to the authenticated user's
ID. Submitted user IDs are ignored. Updates use an allowlist of expense
fields. Missing and other-user IDs both return 404. Tests create two accounts
and verify isolation instead of just checking the successful path.

## Data model

- User: name, normalized unique email, password hash, monthly budget in cents.
- Expense: user ID, description, amount in cents, category, calendar date,
  optional note, creation/update timestamps.
- Session: token hash, user ID, expiration date.

An index on `(userId, date)` supports per-user date ordering. Calendar dates
are ISO date strings to avoid moving an expense to a different day when the
browser timezone changes. A user's budget is a single target reused across
months, not a historical per-month budget table.

## Deliberate scope and tradeoffs

The API returns all expenses for the current account. Month, search, category
filters, summaries, CSV export, and ten-row pagination happen in the browser.
This keeps a small personal project straightforward. For large datasets,
move filtering, pagination, and aggregation to MongoDB and cap response sizes.

CSV export escapes quoted fields and prefixes formula-like values to prevent
spreadsheet formula execution. It exports the full filtered result, not just
the visible ten-row page. Category summaries show the entire selected month
and do not change when table filters change.

Native dialogs provide modal focus handling and Escape dismissal. Responsive
styles adapt the dashboard to phone screens. These are implemented features,
not a claim of a complete accessibility audit.
