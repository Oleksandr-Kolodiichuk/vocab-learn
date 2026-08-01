import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Flashcard from './Flashcard';

const LAST_CARD_KEY = 'vocab-learn:lastFlaggedCardId';

export default function FlaggedWords() {
  const [cards, setCards] = useState(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getFlaggedCards()
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

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards]);

  const handleToggleFlag = (id, flagged) => {
    api.updateCard(id, { flagged }).catch(() => {});
    if (flagged) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flagged } : c)));
      return;
    }
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setIndex((i) => (next.length === 0 ? 0 : Math.min(i, next.length - 1)));
      return next;
    });
  };

  if (error) return <p className="error">Fehler: {error}</p>;
  if (cards === null) return <p>Wird geladen...</p>;

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <p>Noch keine Wörter markiert — tippe auf ☆ auf einer Karte, um sie hier zu sammeln</p>
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
    </div>
  );
}
