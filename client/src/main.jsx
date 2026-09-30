import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CATEGORIES, csv, summarize } from '../../shared/domain.js';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-800.css';
import './styles.css';

const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const currentMonth = () => today().slice(0, 7);
const monthLabel = (month) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
const dateLabel = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
const colors = [
  '#34765f',
  '#d4a648',
  '#7491ab',
  '#bf7a67',
  '#9d92b6',
  '#78966a',
  '#ae859a',
  '#818884',
];

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
async function api(path, method = 'GET', data) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    ...(method !== 'GET'
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data || {}),
        }
      : {}),
  });
  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      result.error || 'Unable to connect. Please try again.',
      response.status,
    );
  return result;
}

function Icon({ name, size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    edit: (
      <>
        <path d="m15 4 5 5M4 20l4-1L21 6l-4-4L4 15z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 8V5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16V8H4a2 2 0 0 1 0-4" />
        <path d="M20 12h-6v5h6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.wallet}
    </svg>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="wallet" size={22} />
      </span>
      <span>
        expense<span className="brand-light">tracker</span>
        <small>MAKE ROOM FOR WHAT MATTERS</small>
      </span>
    </div>
  );
}

function Auth({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api(
        `/auth/${register ? 'register' : 'login'}`,
        'POST',
        body,
      );
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <p className="eyebrow">LESS GUESSWORK. MORE CLARITY.</p>
          <h1>
            A little clarity.
            <br />A lot more freedom.
          </h1>
          <p>
            Know where your money goes, one expense at a time. Keep the
            essentials in view and make room for the things you love.
          </p>
          <div className="story-card">
            <span className="story-icon">
              <Icon name="arrow" size={30} />
            </span>
            <div>
              <strong>Your money, in perspective.</strong>
              <span>Daily spending. Monthly goals. One clear view.</span>
            </div>
          </div>
        </div>
        <small>Personal expense tracking · USD</small>
      </section>
      <section className="auth-form">
        <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>
          {register ? 'Make yourself at home.' : 'Good to see you again.'}
        </h2>
        <p className="muted">
          {register
            ? 'Create an account to start tracking your spending.'
            : 'Sign in to pick up where you left off.'}
        </p>
        <form onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                placeholder="Soma"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={register ? 10 : undefined}
              maxLength={128}
              placeholder={
                register ? 'At least 10 characters' : 'Your password'
              }
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary wide" disabled={busy}>
            {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            <Icon name="arrow" />
          </button>
        </form>
        <p className="auth-switch">
          {register ? 'Already have an account?' : 'New around here?'}{' '}
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <div className="auth-note">
          Your expenses stay private to your account.
        </div>
      </section>
    </main>
  );
}

function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    element.querySelector('input, select, textarea')?.focus();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-body">
        <div className="modal-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function ExpenseForm({ expense, onSave, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(
        Object.fromEntries(new FormData(event.currentTarget)),
        expense?.id,
      );
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={expense ? 'Edit expense' : 'Add an expense'}
      onClose={onClose}
    >
      <p className="muted">The small things add up. Give this one a home.</p>
      <form onSubmit={submit}>
        <label>
          Description
          <input
            name="description"
            required
            maxLength={120}
            autoFocus
            defaultValue={expense?.description || ''}
            placeholder="Coffee with a friend"
          />
        </label>
        <div className="form-row">
          <label>
            Amount (USD)
            <input
              name="amount"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required
              defaultValue={
                expense ? (expense.amountCents / 100).toFixed(2) : ''
              }
              placeholder="0.00"
            />
          </label>
          <label>
            Date
            <input
              name="date"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              required
              defaultValue={expense?.date || today()}
            />
          </label>
        </div>
        <label>
          Category
          <select
            name="category"
            defaultValue={expense?.category || CATEGORIES[0]}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Note <span className="muted">(optional)</span>
          <textarea
            name="note"
            maxLength={500}
            rows={3}
            defaultValue={expense?.note || ''}
            placeholder="Anything you want to remember"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BudgetForm({ budgetCents, onSave, onClose }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(new FormData(e.currentTarget).get('amount'));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Set your monthly budget" onClose={onClose}>
      <p className="muted">
        One spending target for each month. Set it to $0 to remove your target.
      </p>
      <form onSubmit={submit}>
        <label>
          Monthly budget (USD)
          <input
            autoFocus
            name="amount"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={(budgetCents / 100).toFixed(2)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save budget'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Dashboard({ user, setUser, onLogout, onExpired }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  function handleError(err) {
    if (err.status === 401) onExpired();
    else setError(err.message);
  }
  async function load() {
    setLoading(true);
    setError('');
    try {
      setExpenses((await api('/expenses')).expenses);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [month, category, search]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(id);
  }, [notice]);
  const monthly = expenses.filter((e) => e.date.startsWith(month));
  const summary = summarize(monthly);
  const filtered = monthly.filter(
    (e) =>
      (!category || e.category === category) &&
      `${e.description} ${e.note}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const displayPage = Math.min(page, pageCount);
  const remaining = user.budgetCents - summary.totalCents;
  const percentage = user.budgetCents
    ? Math.round((summary.totalCents / user.budgetCents) * 100)
    : 0;
  async function saveExpense(body, id) {
    try {
      const result = await api(
        id ? `/expenses/${id}` : '/expenses',
        id ? 'PATCH' : 'POST',
        body,
      );
      setExpenses((prev) =>
        (id
          ? prev.map((e) => (e.id === id ? result.expense : e))
          : [...prev, result.expense]
        ).sort((a, b) => b.date.localeCompare(a.date)),
      );
      setNotice(id ? 'Expense updated.' : 'Expense added.');
    } catch (err) {
      if (err.status === 401) onExpired();
      throw err;
    }
  }
  async function saveBudget(amount) {
    try {
      setUser((await api('/budget', 'PATCH', { amount })).user);
      setNotice('Monthly budget updated.');
    } catch (err) {
      if (err.status === 401) onExpired();
      throw err;
    }
  }
  async function remove() {
    setDeleting(true);
    setError('');
    try {
      await api(`/expenses/${modal.expense.id}`, 'DELETE');
      setExpenses((prev) => prev.filter((e) => e.id !== modal.expense.id));
      setModal(null);
      setNotice('Expense deleted.');
    } catch (err) {
      handleError(err);
    } finally {
      setDeleting(false);
    }
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([csv(filtered)], { type: 'text/csv;charset=utf-8;' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <a className="nav-item active" href="#overview">
          <Icon name="grid" />
          Overview<span>01</span>
        </a>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="eyebrow">A SMALL REMINDER</span>
            <p>
              Little habits.
              <br />
              Bigger possibilities.
            </p>
            <span>Start with what you spend today.</span>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <button className="text-button" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className="workspace" id="overview">
        <header className="topbar">
          <span>
            PERSONAL FINANCE / <strong>OVERVIEW</strong>
          </span>
          <span className="currency-pill">
            USD <span>·</span> Personal account
          </span>
        </header>
        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">LET’S MAKE IT A GOOD MONTH</p>
              <h1>Your money, at a glance.</h1>
              <p className="muted">
                A clear view of what you spend and what’s still possible.
              </p>
            </div>
            <button
              className="primary"
              onClick={() => setModal({ type: 'expense' })}
            >
              <Icon name="plus" />
              Add expense
            </button>
          </section>
          <div className="period-row">
            <label className="month-control">
              Viewing
              <input
                aria-label="Month"
                type="month"
                min="1900-01"
                max="2100-12"
                value={month}
                onChange={(e) => {
                  if (/^\d{4}-\d{2}$/.test(e.target.value))
                    setMonth(e.target.value);
                }}
              />
            </label>
            <span className="muted">All amounts in US dollars</span>
          </div>
          {error && (
            <div className="error banner" role="alert">
              {error}
              <button className="text-button" onClick={load}>
                Retry
              </button>
            </div>
          )}
          <section className="stats" aria-label="Monthly summary">
            <article className="stat-card dark">
              <div className="stat-label">
                TOTAL SPENT <Icon name="arrow" />
              </div>
              <strong>{loading ? '—' : money(summary.totalCents)}</strong>
              <span>
                {monthLabel(month)} · {summary.count} expense
                {summary.count !== 1 ? 's' : ''}
              </span>
            </article>
            <article className="stat-card">
              <div className="stat-label">
                MONTHLY BUDGET{' '}
                <button
                  className="icon-button"
                  aria-label="Edit monthly budget"
                  onClick={() => setModal({ type: 'budget' })}
                >
                  <Icon name="edit" size={17} />
                </button>
              </div>
              <strong>
                {user.budgetCents ? money(user.budgetCents) : 'Not set'}
              </strong>
              <button
                className="text-button"
                onClick={() => setModal({ type: 'budget' })}
              >
                {user.budgetCents
                  ? 'Adjust your spending target'
                  : 'Set your spending target'}{' '}
                <span>↗</span>
              </button>
            </article>
            <article className="stat-card">
              <div className="stat-label">
                {remaining < 0 && user.budgetCents
                  ? 'OVER BUDGET'
                  : 'LEFT TO SPEND'}
                <span className="status-dot" />
              </div>
              <strong
                className={remaining < 0 && user.budgetCents ? 'negative' : ''}
              >
                {loading
                  ? '—'
                  : user.budgetCents
                    ? money(Math.abs(remaining))
                    : '—'}
              </strong>
              <span>
                {user.budgetCents
                  ? remaining >= 0
                    ? 'A little breathing room.'
                    : 'Time to check in on your spending.'
                  : 'Set a budget to see your balance.'}
              </span>
            </article>
          </section>
          <section className="insights">
            <article className="panel spending-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">THE BIG PICTURE</p>
                  <h2>Where it goes</h2>
                </div>
                <span className="muted">{monthLabel(month)}</span>
              </div>
              {loading ? (
                <p className="empty-insight">Loading your spending…</p>
              ) : summary.count === 0 ? (
                <div className="empty-insight">
                  <Icon name="wallet" size={32} />
                  <p>Your spending story starts here.</p>
                  <span>Add an expense to see your category breakdown.</span>
                </div>
              ) : (
                <div className="category-breakdown">
                  {summary.byCategory.map((item) => (
                    <div className="category-row" key={item.category}>
                      <div>
                        <span
                          className="category-dot"
                          style={{
                            background:
                              colors[CATEGORIES.indexOf(item.category)],
                          }}
                        />
                        <span>{item.category}</span>
                        <strong>{money(item.amountCents)}</strong>
                      </div>
                      <div className="category-track">
                        <div
                          style={{
                            width: `${(item.amountCents / summary.totalCents) * 100}%`,
                            background:
                              colors[CATEGORIES.indexOf(item.category)],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
            <article className="panel budget-panel">
              <p className="eyebrow">A PLAN YOU CAN SEE</p>
              <h2>Your monthly pace</h2>
              <div
                className="budget-circle"
                style={{ '--progress': `${Math.min(percentage, 100)}%` }}
              >
                <div>
                  <strong>{user.budgetCents ? `${percentage}%` : '—'}</strong>
                  <span>of your budget</span>
                </div>
              </div>
              <p>
                {user.budgetCents
                  ? `${money(summary.totalCents)} of ${money(user.budgetCents)}`
                  : 'Every good plan starts with a target.'}
              </p>
              <button
                className="text-button"
                onClick={() => setModal({ type: 'budget' })}
              >
                {user.budgetCents ? 'Update budget' : 'Set a monthly budget'} ↗
              </button>
            </article>
          </section>
          <section className="panel transactions">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">THE EVERYDAY DETAILS</p>
                <h2>
                  Your expenses{' '}
                  <span className="count-pill">{filtered.length}</span>
                </h2>
              </div>
              <button
                className="secondary export-button"
                disabled={loading || !filtered.length}
                onClick={exportCsv}
              >
                <Icon name="download" size={17} />
                Export CSV
              </button>
            </div>
            <div className="filters">
              <label className="search-field">
                <Icon name="search" size={18} />
                <input
                  aria-label="Search expenses"
                  type="search"
                  placeholder="Search descriptions or notes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter by category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {loading ? (
              <p className="empty-table" role="status">
                Loading your expenses…
              </p>
            ) : filtered.length === 0 ? (
              <div className="empty-table">
                <Icon name="wallet" size={34} />
                <h3>
                  {monthly.length
                    ? 'No matching expenses.'
                    : 'A fresh page for your spending.'}
                </h3>
                <p>
                  {monthly.length
                    ? 'Try another search or category.'
                    : 'Add your first expense for this month to get started.'}
                </p>
                <button
                  className="secondary"
                  onClick={() =>
                    monthly.length
                      ? (setSearch(''), setCategory(''))
                      : setModal({ type: 'expense' })
                  }
                >
                  {monthly.length ? 'Clear filters' : 'Add your first expense'}
                </button>
              </div>
            ) : (
              <>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Expenses table"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th className="amount-cell">Amount</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered
                        .slice((displayPage - 1) * 10, displayPage * 10)
                        .map((e) => (
                          <tr key={e.id}>
                            <td>
                              <strong>{e.description}</strong>
                              {e.note && <small>{e.note}</small>}
                            </td>
                            <td>
                              <span className="category-badge">
                                <span
                                  className="category-dot"
                                  style={{
                                    background:
                                      colors[CATEGORIES.indexOf(e.category)],
                                  }}
                                />
                                {e.category}
                              </span>
                            </td>
                            <td className="date-cell">{dateLabel(e.date)}</td>
                            <td className="amount-cell">
                              <strong>{money(e.amountCents)}</strong>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="icon-button"
                                  aria-label={`Edit ${e.description}`}
                                  onClick={() =>
                                    setModal({ type: 'expense', expense: e })
                                  }
                                >
                                  <Icon name="edit" size={17} />
                                </button>
                                <button
                                  className="icon-button delete-button"
                                  aria-label={`Delete ${e.description}`}
                                  onClick={() =>
                                    setModal({ type: 'delete', expense: e })
                                  }
                                >
                                  <Icon name="trash" size={17} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>
                    Showing {(displayPage - 1) * 10 + 1}–
                    {Math.min(displayPage * 10, filtered.length)} of{' '}
                    {filtered.length}
                  </span>
                  <div>
                    <button
                      className="secondary"
                      disabled={displayPage === 1}
                      onClick={() => setPage(displayPage - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      {displayPage} / {pageCount}
                    </span>
                    <button
                      className="secondary"
                      disabled={displayPage === pageCount}
                      onClick={() => setPage(displayPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
          <footer className="page-footer">
            <span>A little awareness goes a long way.</span>
            <span>Expense Tracker · Personal finance, simplified.</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}
      {modal?.type === 'expense' && (
        <ExpenseForm
          expense={modal.expense}
          onSave={saveExpense}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'budget' && (
        <BudgetForm
          budgetCents={user.budgetCents}
          onSave={saveBudget}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <Modal title="Delete this expense?" onClose={() => setModal(null)}>
          <p>
            This will permanently remove{' '}
            <strong>{modal.expense.description}</strong> (
            {money(modal.expense.amountCents)}).
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              Keep expense
            </button>
            <button className="danger" disabled={deleting} onClick={remove}>
              {deleting ? 'Deleting…' : 'Delete expense'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function restore() {
    setLoading(true);
    setError('');
    try {
      setUser((await api('/auth/me')).user);
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    restore();
  }, []);
  async function logout() {
    try {
      await api('/auth/logout', 'POST');
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  }
  if (loading)
    return (
      <main className="loading-page">
        <Brand />
        <p role="status">Getting things ready…</p>
      </main>
    );
  if (error)
    return (
      <main className="loading-page">
        <Brand />
        <p className="error" role="alert">
          {error}
        </p>
        <button className="primary" onClick={restore}>
          Try again
        </button>
      </main>
    );
  return user ? (
    <Dashboard
      user={user}
      setUser={setUser}
      onLogout={logout}
      onExpired={() => setUser(null)}
    />
  ) : (
    <Auth onLogin={setUser} />
  );
}

createRoot(document.getElementById('root')).render(<App />);
