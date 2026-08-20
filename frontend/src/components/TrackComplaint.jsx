import { useState } from 'react';
import { trackComplaint } from '../api';
import RouteTrack from './RouteTrack';
import './ComplaintForm.css';
import './TrackComplaint.css';

export default function TrackComplaint() {
  const [id, setId] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!id.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await trackComplaint(id);
      setResult(data);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
      setResult(null);
    }
  }

  return (
    <div className="card">
      <span className="eyebrow">Track my complaint</span>
      <h2>Where does it stand?</h2>
      <p className="form-intro">Enter the complaint ID you received when you submitted your report.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="complaint-id" className="field-label">
          Complaint ID
        </label>
        <input
          id="complaint-id"
          className="text-input"
          type="text"
          placeholder="e.g. GC-2026-5EJWTS"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />

        {status === 'error' && <p className="error-text">{errorMsg}</p>}

        <button type="submit" className="btn btn--primary btn--full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Looking up…' : 'Track complaint'}
        </button>
      </form>

      {status === 'done' && result && (
        <div className="track-result">
          <div className="track-result__row">
            <span className="confirmation__stat-label">Department</span>
            <span className="confirmation__stat-value">{result.department_name}</span>
          </div>
          <div className="track-result__row">
            <span className="confirmation__stat-label">Category</span>
            <span className="confirmation__stat-value">{result.category}</span>
          </div>
          <div className="track-result__row">
            <span className="confirmation__stat-label">Expected resolution</span>
            <span className="confirmation__stat-value">~{result.eta_days} days</span>
          </div>
          {result.queue_position && (
            <div className="track-result__row">
              <span className="confirmation__stat-label">Queue position</span>
              <span className="confirmation__stat-value">#{result.queue_position}</span>
            </div>
          )}
          <RouteTrack status={result.status} />
          <div className="status-history" aria-label="Complaint status history">
            <h3>Status updates</h3>
            {result.history?.map((entry) => (
              <div className="status-history__item" key={`${entry.status}-${entry.changed_at}`}>
                <strong>{entry.status}</strong>
                <span>{new Date(entry.changed_at).toLocaleString()}</span>
                {entry.note && <small>{entry.note}</small>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
