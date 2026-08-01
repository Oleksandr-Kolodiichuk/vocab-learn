import { useEffect, useState } from 'react';
import ReviewSession from './components/ReviewSession';
import CardList from './components/CardList';
import FlaggedWords from './components/FlaggedWords';
import Login from './components/Login';
import { api } from './api/client';

const THEME_KEY = 'vocab-learn:theme';

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [tab, setTab] = useState('review');
  const [stats, setStats] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.getStats().then(setStats).catch(() => {});
  }, [tab, user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  if (checkingAuth) return null;

  if (!user) {
    return <Login onLoggedIn={setUser} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-top">
          <h1>Vocab Learn</h1>
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Theme wechseln">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user.picture && <img className="user-avatar" src={user.picture} alt={user.name || user.email} />}
            <button className="btn-logout" onClick={handleLogout}>
              Abmelden
            </button>
          </div>
        </div>
        {stats && (
          <div className="stats">
            <span>Gesamt: {stats.total}</span>
            <span>Ohne Übersetzung: {stats.untranslated}</span>
            <span>Unbekannt: {stats.flagged}</span>
          </div>
        )}
        <nav className="tabs-row">
          <div className="tabs">
            <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
              Karten
            </button>
            <button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>
              Alle Karten
            </button>
          </div>
          <div className="tabs tabs-flagged">
            <button className={tab === 'flagged' ? 'active' : ''} onClick={() => setTab('flagged')}>
              ★ Unbekannt
            </button>
          </div>
        </nav>
      </header>
      <main>
        <div className="tab-content" key={tab}>
          {tab === 'review' && <ReviewSession />}
          {tab === 'cards' && <CardList />}
          {tab === 'flagged' && <FlaggedWords />}
        </div>
      </main>
    </div>
  );
}
