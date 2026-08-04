import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Flashcard from './Flashcard';

const LAST_CARD_KEY = 'vocab-learn:lastCardId';

export default function ReviewSession({ setId }) {
  const [cards, setCards] = useState(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const [error, setError] = useState(null);
  const [autoplay, setAutoplay] = useState(false);
  const [autoplaySeconds, setAutoplaySeconds] = useState(8);

  useEffect(() => {
    api
      .getCards({ setId })
      .then((data) => {
        setCards(data);
        const lastId = Number(localStorage.getItem(LAST_CARD_KEY));
        const savedIndex = data.findIndex((c) => c.id === lastId);
        setIndex(savedIndex >= 0 ? savedIndex : 0);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (cards && cards[index]) {
      localStorage.setItem(LAST_CARD_KEY, cards[index].id);
    }
  }, [cards, index]);

  const goPrev = () => {
    setDirection('prev');
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  };

  const goNext = () => {
    setDirection('next');
    setIndex((i) => (i + 1) % cards.length);
  };

  const handleToggleFlag = (id, flagged) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flagged } : c)));
    api.updateCard(id, { flagged }).catch(() => {});
  };

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'z' || e.key === 'Z' || e.key === '/') {
        e.preventDefault();
        const current = cards[index];
        handleToggleFlag(current.id, !current.flagged);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, index]);

  useEffect(() => {
    if (!autoplay || !cards || cards.length < 2) return;
    const id = window.setInterval(goNext, autoplaySeconds * 1000);
    return () => window.clearInterval(id);
  }, [autoplay, autoplaySeconds, cards]);

  if (error) return <p className="error">Fehler: {error}</p>;
  if (cards === null) return <p>Wird geladen...</p>;

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <p>Es gibt noch keine Karten — füge Wörter im Tab "Alle Karten" hinzu</p>
      </div>
    );
  }

  const card = cards[index];
  const progress = ((index + 1) / cards.length) * 100;

  return (
    <div>
      <p className="queue-counter">
        {index + 1} / {cards.length}
      </p>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className={`card-slide card-slide-${direction}`} key={card.id}>
        <Flashcard card={card} onToggleFlag={handleToggleFlag} />
      </div>
      <div className="browse-nav">
        <button onClick={goPrev}>← Zurück</button>
        <button onClick={goNext}>Weiter →</button>
      </div>
      <div className="autoplay-controls">
        <button
          className={`autoplay-toggle${autoplay ? ' active' : ''}`}
          onClick={() => setAutoplay((a) => !a)}
        >
          {autoplay ? '⏸ Auto' : '▶ Auto'}
        </button>
        <input
          type="range"
          min="3"
          max="20"
          step="1"
          value={autoplaySeconds}
          onChange={(e) => setAutoplaySeconds(Number(e.target.value))}
          aria-label="Automatisches Umblättern (Sekunden)"
        />
        <span className="autoplay-seconds">{autoplaySeconds}s</span>
      </div>
    </div>
  );
}
