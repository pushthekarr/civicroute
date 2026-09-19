import { useEffect, useMemo, useState } from 'react';
import {
  fetchOfficialComplaints,
  officialLogin,
  officialLogout,
  officialSession,
  updateOfficialComplaint,
} from '../api';
import RouteTrack from './RouteTrack';
import './OfficialPortal.css';

const PRIORITY = {
  1: 'Urgent',
  2: 'High',
  3: 'Normal',
  4: 'Routine',
  5: 'Low',
};

const NEXT_STATUS = {
  Submitted: 'Routed',
  Routed: 'In Progress',
  'In Progress': 'Resolved',
  Resolved: null,
};

const EMPTY_FILTERS = {
  id: '',
  department: '',
  status: '',
  priority: '',
  date: '',
  locality: '',
};

export default function OfficialPortal({ onCitizenPortal }) {
  const [auth, setAuth] = useState(null);

  const [credentials, setCredentials] = useState({
    username: 'admin@civicroute.gov.in',
    password: '',
  });

  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(nextFilters = filters) {
    setLoading(true);

    try {
      const result = await fetchOfficialComplaints(nextFilters);

      setData(result);

      setSelected((old) =>
        result.complaints.find((item) => item.id === old?.id) ||
        result.complaints[0] ||
        null
      );

      setError('');
    } catch (err) {
      setError(err.message);

      if (/authentication/i.test(err.message)) {
        setAuth(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    officialSession()
      .then((session) => {
        setAuth(session);
        return load(EMPTY_FILTERS);
      })
      .catch(() => setAuth(false));
  }, []);

  async function login(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const session = await officialLogin(
        credentials.username,
        credentials.password
      );

      setAuth(session);
      await load(EMPTY_FILTERS);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await officialLogout();
    setAuth(false);
    setData(null);
    setSelected(null);
  }

  async function applyFilters(event) {
    event.preventDefault();
    await load(filters);
  }

  async function saveComplaint(event) {
    event.preventDefault();

    if (!selected) return;

    const form = new FormData(event.currentTarget);

    const payload = {
      internalNote: form.get('internalNote'),
    };

    if (form.get('status') !== selected.status) {
      payload.status = form.get('status');
    }

    try {
      const updated = await updateOfficialComplaint(selected.id, payload);

      setSelected(updated);
      await load(filters);
    } catch (err) {
      setError(err.message);
    }
  }

  const stats = useMemo(() => {
    const items = data?.complaints || [];

    return {
      total: items.length,
      open: items.filter((item) => item.status !== 'Resolved').length,
      progress: items.filter((item) => item.status === 'In Progress').length,
      urgent: items.filter(
        (item) => item.priority <= 2 && item.status !== 'Resolved'
      ).length,
    };
  }, [data]);

  if (auth === null) {
    return (
      <div className="official-state">
        Checking official session…
      </div>
    );
  }

  if (!auth) {
    return (
      <section className="official-login">
        <span className="eyebrow">Restricted municipal service</span>

        <h2>Municipality official login</h2>

        <p>
          Use the preconfigured municipality account. Citizen complaints remain
          accessible only through protected official APIs.
        </p>

        <form onSubmit={login}>
          <label>
            Official username
            <input
              type="email"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({
                  ...credentials,
                  username: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({
                  ...credentials,
                  password: e.target.value,
                })
              }
              required
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button
            className="btn btn--primary"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in securely'}
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={onCitizenPortal}
          >
            Return to citizen portal
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className="official-page">
      <div className="official-banner">
        <div className="container">
          <span className="eyebrow">
            CivicRoute · restricted official workspace
          </span>

          <h2>Municipality operations dashboard</h2>

          <p>
            Signed in as {auth.username}. Citizen information is displayed only
            for authorised case handling.
          </p>

          <button
            className="btn btn--secondary"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      <main className="container official-main">
        <section className="official-metrics">
          <article>
            <span>Visible complaints</span>
            <strong>{stats.total}</strong>
          </article>

          <article>
            <span>Open cases</span>
            <strong>{stats.open}</strong>
          </article>

          <article>
            <span>In progress</span>
            <strong>{stats.progress}</strong>
          </article>

          <article>
            <span>Urgent / high</span>
            <strong>{stats.urgent}</strong>
          </article>
        </section>

        <form
          className="official-filters"
          onSubmit={applyFilters}
        >
          <input
            placeholder="Complaint ID"
            value={filters.id}
            onChange={(e) =>
              setFilters({
                ...filters,
                id: e.target.value,
              })
            }
          />

          <select
            value={filters.department}
            onChange={(e) =>
              setFilters({
                ...filters,
                department: e.target.value,
              })
            }
          >
            <option value="">All departments</option>

            {data?.departments.map((department) => (
              <option key={department}>
                {department}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value,
              })
            }
          >
            <option value="">All statuses</option>

            {data?.statuses.map((status) => (
              <option key={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) =>
              setFilters({
                ...filters,
                priority: e.target.value,
              })
            }
          >
            <option value="">All priorities</option>

            {[1, 2, 3, 4, 5].map((value) => (
              <option value={value} key={value}>
                {value} — {PRIORITY[value]}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.date}
            onChange={(e) =>
              setFilters({
                ...filters,
                date: e.target.value,
              })
            }
          />

          <input
            placeholder="Locality / address"
            value={filters.locality}
            onChange={(e) =>
              setFilters({
                ...filters,
                locality: e.target.value,
              })
            }
          />

          <button
            className="btn btn--primary"
            disabled={loading}
          >
            Filter
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}

        <section className="official-workspace">
          <div className="official-table">
            <h3>Registered complaints</h3>

            {data?.complaints.length ? (
              data.complaints.map((item) => (
                <button
                  className={
                    selected?.id === item.id
                      ? 'selected'
                      : ''
                  }
                  onClick={() => setSelected(item)}
                  key={item.id}
                >
                  <strong>{item.id}</strong>
                  <span>{item.department}</span>
                  <span>
                    {item.status} · P{item.priority}
                  </span>
                  <small>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </small>
                </button>
              ))
            ) : (
              <p>No complaints match these filters.</p>
            )}
          </div>

          {selected && (
            <article className="official-detail">
              <div className="detail-heading">
                <div>
                  <span className="eyebrow">Case file</span>
                  <h3>{selected.id}</h3>
                </div>

                <span className="status-pill">
                  {selected.status}
                </span>
              </div>

              <RouteTrack status={selected.status} />

              <dl>
                <div>
                  <dt>Department</dt>
                  <dd>{selected.department}</dd>
                </div>

                <div>
                  <dt>Category</dt>
                  <dd>{selected.category}</dd>
                </div>

                <div>
                  <dt>Priority / queue</dt>
                  <dd>
                    {PRIORITY[selected.priority]} ·{' '}
                    {selected.queuePosition
                      ? `#${selected.queuePosition}`
                      : 'Not in active queue'}
                  </dd>
                </div>

                <div>
                  <dt>ETA / created</dt>
                  <dd>
                    ~{selected.etaDays} days ·{' '}
                    {new Date(selected.createdAt).toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt>Locality</dt>
                  <dd>
                    {selected.location || 'Not available'}
                  </dd>
                </div>

                <div>
                  <dt>Citizen contact</dt>
                  <dd>
                    {selected.citizen?.full_name || 'Not available'}
                    <br />
                    {selected.citizen?.email || 'Not available'}
                    <br />
                    {selected.citizen?.phone || 'Not available'}
                  </dd>
                </div>
              </dl>

              <h4>Complaint details</h4>

              <p>
                {selected.description || 'No complaint description available.'}
              </p>

              <form onSubmit={saveComplaint}>
                <label>
                  Status

                  <select
                    name="status"
                    defaultValue={selected.status}
                  >
                    <option value={selected.status}>
                      {selected.status}
                    </option>

                    {NEXT_STATUS[selected.status] && (
                      <option value={NEXT_STATUS[selected.status]}>
                        {NEXT_STATUS[selected.status]}
                      </option>
                    )}
                  </select>
                </label>

                <label>
                  Internal official note

                  <textarea
                    name="internalNote"
                    defaultValue={selected.internalNote || ''}
                    rows="4"
                    maxLength="1000"
                    placeholder="Visible only to authorised officials"
                  />
                </label>

                <button className="btn btn--primary">
                  Save case update
                </button>
              </form>

              <h4>Lifecycle history</h4>

              <div className="official-history">
                {(selected.history || []).map((entry) => (
                  <div
                    key={`${entry.status}-${entry.changed_at}`}
                  >
                    <strong>{entry.status}</strong>

                    <span>
                      {new Date(
                        entry.changed_at
                      ).toLocaleString()}
                    </span>

                    <small>
                      {entry.note}
                    </small>
                  </div>
                ))}
              </div>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
