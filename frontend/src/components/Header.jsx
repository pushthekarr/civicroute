import './Header.css';

const TABS = [
  { id: 'home', label: 'Home' }, { id: 'lodge', label: 'Lodge Complaint' }, { id: 'track', label: 'Track Complaint' },
  { id: 'dashboard', label: 'Public Dashboard' }, { id: 'departments', label: 'Departments' }, { id: 'process', label: 'Grievance Process' },
  { id: 'help', label: 'Help / FAQ' }, { id: 'contact', label: 'Contact Us' }, { id: 'login', label: 'Official Login' },
];

export default function Header({ active, onChange }) {
  return (
    <header className="header">
      <div className="container header__top">
        <div className="header__brand">
          <div className="header__mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="6" cy="14" r="4" fill="#E8A93B" />
              <circle cx="22" cy="6" r="3" fill="#1B2A4A" />
              <circle cx="22" cy="22" r="3" fill="#1B2A4A" />
              <path d="M9 12L19 7" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 16L19 21" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="header__title">CivicRoute</h1>
            <p className="header__tagline">Citizen grievance service · Government-style civic assistance</p>
          </div>
        </div>
      </div>
      <nav className="header__nav">
        <div className="container header__nav-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`header__tab ${active === tab.id ? 'is-active' : ''}`}
              onClick={() => onChange(tab.id)}
              aria-current={active === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
