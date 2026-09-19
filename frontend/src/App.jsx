import { lazy, Suspense, useState } from 'react';
import Header from './components/Header';
import ComplaintForm from './components/ComplaintForm';
import TrackComplaint from './components/TrackComplaint';
import Home from './components/Home';
import PortalInfo from './components/PortalInfo';
import OfficialPortal from './components/OfficialPortal';
const Dashboard = lazy(() => import('./components/Dashboard'));

export default function App() {
  const [tab, setTab] = useState('home');

  return (
    <div className="app">
      <Header active={tab} onChange={setTab} />
      <main>
        {tab === 'home' && <Home navigate={setTab} />}
        {tab === 'lodge' && <ComplaintForm onTrack={() => setTab('track')} onHome={() => setTab('home')} />}
        {tab === 'track' && <TrackComplaint />}
        {['departments', 'process', 'help', 'contact'].includes(tab) && <PortalInfo page={tab} navigate={setTab} />}
        {tab === 'login' && <OfficialPortal onCitizenPortal={() => setTab('home')} />}
        {tab === 'dashboard' && <Suspense fallback={<div className="dashboard-state">Loading dashboard…</div>}><Dashboard /></Suspense>}
      </main>
      <footer className="app-footer">
        <p>CivicRoute — Final Year Major Project · No login required</p>
      </footer>
    </div>
  );
}
