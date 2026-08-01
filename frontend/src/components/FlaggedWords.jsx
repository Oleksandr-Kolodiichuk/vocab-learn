import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function FlaggedWords() {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    api.getFlaggedCards().then(setCards).catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnflag = async (id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    await api.updateCard(id, { flagged: false }).catch(() => {});
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

  return (
    <table className="cards-table">
      <thead>
        <tr>
          <th>Wort</th>
          <th>Übersetzung</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {cards.map((card) => (
          <tr key={card.id}>
            <td data-label="Wort">{card.front}</td>
            <td data-label="Übersetzung">{card.back || <em>—</em>}</td>
            <td data-label="">
              <button className="btn-delete" onClick={() => handleUnflag(card.id)}>
                Entfernen
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
