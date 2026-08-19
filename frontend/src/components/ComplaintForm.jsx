import { useState, useRef } from 'react';
import { submitComplaint } from '../api';
import RouteTrack from './RouteTrack';
import './ComplaintForm.css';

const PRIORITY_META = {
  1: { label: 'Urgent', color: 'var(--urgent)' },
  2: { label: 'High', color: 'var(--marigold-dark)' },
  3: { label: 'Medium', color: 'var(--marigold)' },
  4: { label: 'Low', color: 'var(--text-muted)' },
  5: { label: 'Low', color: 'var(--text-muted)' },
};

export default function ComplaintForm() {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (text.trim().length < 5) {
      setErrorMsg('Please describe the issue in a bit more detail.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await submitComplaint(text, imageFile);
      setResult(data);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  function resetForm() {
    setText('');
    removeImage();
    setResult(null);
    setStatus('idle');
  }

  if (status === 'done' && result) {
    const priority = PRIORITY_META[result.priority] || PRIORITY_META[3];
    return (
      <div className="card confirmation">
        <span className="eyebrow">Complaint registered</span>
        <h2 className="confirmation__id">{result.complaintId}</h2>
        <p className="confirmation__hint">Save this ID — you'll need it to track progress.</p>

        <div className="confirmation__grid">
          <div className="confirmation__stat">
            <span className="confirmation__stat-label">Routed to</span>
            <span className="confirmation__stat-value">{result.department}</span>
          </div>
          <div className="confirmation__stat">
            <span className="confirmation__stat-label">Priority</span>
            <span className="confirmation__stat-value" style={{ color: priority.color }}>
              {priority.label}
            </span>
          </div>
          <div className="confirmation__stat">
            <span className="confirmation__stat-label">Expected resolution</span>
            <span className="confirmation__stat-value">~{result.etaDays} days</span>
          </div>
        </div>

        <RouteTrack status={result.status} />

        <button className="btn btn--primary" onClick={resetForm}>
          Report another issue
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <span className="eyebrow">Report an issue</span>
      <h2>What's the problem?</h2>
      <p className="form-intro">
        Describe it in your own words — English, Hindi, Marathi, or a mix. We'll figure out where it needs to go.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="complaint-text" className="field-label">
          Describe the issue
        </label>
        <textarea
          id="complaint-text"
          className="textarea"
          rows={5}
          placeholder="e.g. Sadar road madhe khup potholes ahet, gadya pass karta yet nahit..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <label className="field-label">Add a photo (optional)</label>
        {!imagePreview ? (
          <label className="upload-box">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
            <span className="upload-box__icon">+</span>
            <span>Tap to add a photo</span>
          </label>
        ) : (
          <div className="upload-preview">
            <img src={imagePreview} alt="Complaint attachment preview" />
            <button type="button" className="upload-preview__remove" onClick={removeImage}>
              Remove
            </button>
          </div>
        )}

        {status === 'error' && <p className="error-text">{errorMsg}</p>}

        <button type="submit" className="btn btn--primary btn--full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>
    </div>
  );
}
