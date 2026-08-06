import { useEffect, useState } from 'react';
import ReviewSession from './components/ReviewSession';
import CardList from './components/CardList';
import FlaggedWords from './components/FlaggedWords';
import Login from './components/Login';
import SetSwitcher from './components/SetSwitcher';
import WordMap from './components/WordMap';
import { api } from './api/client';

const THEME_KEY = 'vocab-learn:theme';
const SET_KEY = 'vocab-learn:currentSetId';

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
  const [sets, setSets] = useState([]);
  const [setsLoaded, setSetsLoaded] = useState(false);
  const [currentSetId, setCurrentSetId] = useState(() => {
    const saved = Number(localStorage.getItem(SET_KEY));
    return saved || null;
  });

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  const loadSets = () => {
    api.getSets().then((data) => {
      setSets(data);
      setCurrentSetId((prev) => (prev && data.some((s) => s.id === prev) ? prev : data[0]?.id ?? null));
      setSetsLoaded(true);
    });
  };

  useEffect(() => {
    if (!user) return;
    loadSets();
  }, [user]);

  useEffect(() => {
    if (currentSetId) localStorage.setItem(SET_KEY, currentSetId);
  }, [currentSetId]);

  useEffect(() => {
    if (!user || !currentSetId) return;
    api.getStats(currentSetId).then(setStats).catch(() => {});
  }, [tab, user, currentSetId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  const handleCreateFirstSet = async () => {
    const name = window.prompt('Name für dein erstes Set:', 'Meine Wörter');
    if (name && name.trim()) await handleCreateSet(name.trim());
  };

  const handleCreateSet = async (name) => {
    const created = await api.createSet(name);
    setSets((prev) => [...prev, created]);
    setCurrentSetId(created.id);
  };

  const handleRenameSet = async (id, name) => {
    const updated = await api.renameSet(id, name);
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, name: updated.name } : s)));
  };

  const handleDeleteSet = async (id) => {
    await api.deleteSet(id);
    loadSets();
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
              <span className="theme-icon" key={theme}>
                {theme === 'dark' ? '☀️' : '🌙'}
              </span>
            </button>
            {user.picture && <img className="user-avatar" src={user.picture} alt={user.name || user.email} />}
            <button className="btn-logout" onClick={handleLogout}>
              Abmelden
            </button>
          </div>
        </div>
        <SetSwitcher
          sets={sets}
          currentSetId={currentSetId}
          onSelect={setCurrentSetId}
          onCreate={handleCreateSet}
          onRename={handleRenameSet}
          onDelete={handleDeleteSet}
        />
        {stats && (
          <div className="stats">
            <span>
              Gesamt: <span className="stat-value" key={`total-${stats.total}`}>{stats.total}</span>
            </span>
            <span>
              Ohne Übersetzung:{' '}
              <span className="stat-value" key={`untranslated-${stats.untranslated}`}>
                {stats.untranslated}
              </span>
            </span>
            <span>
              Unbekannt: <span className="stat-value" key={`flagged-${stats.flagged}`}>{stats.flagged}</span>
            </span>
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
            <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
              🗺️ Karte
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
        {currentSetId && (
          <div className="tab-content" key={`${tab}-${currentSetId}`}>
            {tab === 'review' && <ReviewSession setId={currentSetId} />}
            {tab === 'cards' && <CardList setId={currentSetId} currentSet={sets.find((s) => s.id === currentSetId)} onCardsChanged={loadSets} />}
            {tab === 'flagged' && <FlaggedWords setId={currentSetId} />}
            {tab === 'map' && <WordMap setId={currentSetId} />}
          </div>
        )}
        {setsLoaded && !currentSetId && (
          <div className="empty-state">
            <p>Du hast noch kein Set — erstelle eines, um Karten hinzuzufügen</p>
            <button onClick={handleCreateFirstSet}>Set erstellen</button>
          </div>
        )}
      </main>
    </div>
  );
}
