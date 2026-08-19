import { useState } from 'react';
import Header from './components/Header';
import ComplaintForm from './components/ComplaintForm';
import TrackComplaint from './components/TrackComplaint';
import Dashboard from './components/Dashboard';

export default function App() {
  const [tab, setTab] = useState('submit');

  return (
    <div className="app">
      <Header active={tab} onChange={setTab} />
      <main>
        {tab === 'submit' && <ComplaintForm />}
        {tab === 'track' && <TrackComplaint />}
        {tab === 'dashboard' && <Dashboard />}
      </main>
      <footer className="app-footer">
        <p>CivicRoute — Final Year Major Project · No login required</p>
      </footer>
    </div>
  );
}
