# Deployment

The app serves its production React build and API from one Express service.
Use a Node.js host and persistent MongoDB (for example, MongoDB Atlas).
No live deployment is claimed by this repository.

## Node hosting

1. Connect the repository to your hosting provider and choose Node.js 24.
2. Set build command `npm ci && npm run build`.
3. Set start command `npm start`.
4. Configure these variables in the provider's environment settings:
   - `MONGODB_URI`: the database connection string, including database name.
   - `NODE_ENV`: `production`.
   - `APP_ORIGIN`: the exact public HTTPS origin, without a trailing slash.
   - `PORT`: normally supplied by the provider; defaults to `3001`.
   - `TRUST_PROXY`: `1` only if exactly one trusted reverse proxy sits in front of Express.
5. Configure the database user and network access for this service. Give the
   database user access only to this application's database. Do not publish credentials.
6. Route HTTPS traffic to the service and use `/api/health` as the health-check path.

Do not deploy this app as a frontend-only static site: accounts and expenses
require its Node service and MongoDB. The browser uses relative `/api` requests,
so it needs no hardcoded backend URL or cross-origin cookie configuration.

## Docker alternative

```sh
docker build -t expense-tracker .
docker run --env-file .env.production -p 3001:3001 expense-tracker
```

Create `.env.production` locally with the production variables above. Keep it
out of Git. Place the container behind an HTTPS reverse proxy. Docker execution
has not been verified in the development environment; the Node build has.

## Verify after deployment

- `/api/health` returns HTTP 200 with `{"status":"ok"}`.
- Create an account, add an expense, and refresh: the expense remains.
- Set a budget, sign out, and sign in again: the budget remains.
- With a second account, confirm the first account's expenses are absent.
- Confirm session cookies have `HttpOnly`, `Secure`, and `SameSite=Strict`.
- Confirm incorrect credentials and invalid amounts show understandable errors.
- Export a CSV and open it; only the visible month/search/category selection is exported.
- Try a phone-sized screen.

After these checks, add the actual demo URL and deployment date to the README
and GitHub's About section. Record the deployed commit SHA. Do not add a live
demo badge before deployment is verified.

## Operational limits

Authentication rate limiting uses an in-process store. A multi-instance
deployment needs a shared limiter store. Add monitoring, backups, recovery
procedures, email verification, and password reset before treating this as a
production financial service. No bank connection or sensitive financial data
is needed for a recruiter demo; use fictional expenses.
