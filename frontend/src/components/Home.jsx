import { useEffect, useState } from 'react';
import { fetchStats } from '../api';
import './Home.css';

const SERVICES = ['Roads & PWD', 'Water Supply', 'Sanitation & Garbage', 'Street Lighting', 'Public Health', 'Environment & Pollution'];
const NOTICES = [
  'CivicRoute accepts civic grievance reports in English, Hindi, Marathi, Hinglish, and mixed-language text.',
  'A reference number is issued only after you review the AI-suggested routing and register the grievance.',
  'For an immediate threat to life or safety, contact the relevant emergency service instead of waiting for portal processing.',
];

export default function Home({ navigate }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { fetchStats().then(setStats).catch(() => setStats(null)); }, []);
  return <div className="home-page">
    <section className="hero"><div className="container hero__grid"><div><span className="eyebrow">Citizen grievance service</span><h2>One place to raise and follow civic service issues</h2><p>Describe the concern in your preferred language. CivicRoute suggests the right department, lets you review the details, and provides a reference number for tracking.</p><div className="hero__actions"><button className="btn btn--primary" onClick={() => navigate('lodge')}>Lodge a complaint</button><button className="btn btn--secondary" onClick={() => navigate('track')}>Track complaint</button></div></div><aside className="hero__notice"><strong>Before you begin</strong><p>Keep your contact details, address/locality, and Aadhaar ready. Aadhaar is validated for this project but the full number is never stored.</p><button className="text-action" onClick={() => navigate('process')}>Understand the grievance process →</button></aside></div></section>
    <main className="container home-content">
      <section className="home-section"><div className="section-heading"><div><span className="eyebrow">How it works</span><h3>A clear, review-first process</h3></div></div><div className="process-cards">{[['1', 'Describe your issue', 'Add the issue, location, and an optional supporting photo.'], ['2', 'Review AI routing', 'Check and edit the suggested department, category, and priority.'], ['3', 'Register & track', 'Confirm the declaration and save your CivicRoute reference number.']].map(([number, title, text]) => <article key={number}><span>{number}</span><h4>{title}</h4><p>{text}</p></article>)}</div></section>
      <section className="home-section service-section"><div className="section-heading"><div><span className="eyebrow">Departments & services</span><h3>Common civic service shortcuts</h3></div><button className="text-action" onClick={() => navigate('departments')}>View all departments →</button></div><div className="service-grid">{SERVICES.map((service) => <button key={service} onClick={() => navigate('lodge')}><span aria-hidden="true">↗</span>{service}</button>)}</div></section>
      <section className="home-section home-grid"><article className="public-card"><span className="eyebrow">Public information</span><h3>Service snapshot</h3><p>These totals are calculated from CivicRoute records. No identity, complaint text, or individual address is displayed.</p><div className="home-stats"><div><strong>{stats?.total ?? '—'}</strong><span>Registered grievances</span></div><div><strong>{stats?.openCount ?? '—'}</strong><span>Open grievances</span></div><div><strong>{stats?.resolvedCount ?? '—'}</strong><span>Resolved grievances</span></div></div><button className="text-action" onClick={() => navigate('dashboard')}>Open public dashboard →</button></article><article className="notice-card"><span className="eyebrow">Notices & information</span><h3>Using CivicRoute</h3><ul>{NOTICES.map((notice) => <li key={notice}>{notice}</li>)}</ul><button className="text-action" onClick={() => navigate('help')}>Help and frequently asked questions →</button></article></section>
    </main>
  </div>;
}
