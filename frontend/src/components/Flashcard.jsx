import { useState } from 'react';

export default function Flashcard({ card, onToggleFlag }) {
  const [flipped, setFlipped] = useState(false);

  const handleFlagClick = (e) => {
    e.stopPropagation();
    onToggleFlag(card.id, !card.flagged);
  };

  return (
    <div className="flip-card" onClick={() => setFlipped((f) => !f)}>
      <button
        className={`flag-toggle${card.flagged ? ' flagged' : ''}`}
        onClick={handleFlagClick}
        title={card.flagged ? 'Aus der Liste entfernen' : 'Als unbekannt markieren'}
      >
        {card.flagged ? '★' : '☆'}
      </button>
      <div className={`flip-card-inner${flipped ? ' flipped' : ''}`}>
        <div className="flip-card-face flip-card-front">
          <p className="flashcard-front">{card.front}</p>
        </div>
        <div className="flip-card-face flip-card-back">
          <p className="flashcard-front">
            {card.back || <em>Übersetzung noch nicht hinzugefügt</em>}
          </p>
        </div>
      </div>
    </div>
  );
}
