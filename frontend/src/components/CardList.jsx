import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export default function CardList({ setId, currentSet, onCardsChanged }) {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState('');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [jsonImporting, setJsonImporting] = useState(false);
  const [jsonMessage, setJsonMessage] = useState('');
  const [onlyFlaggedExport, setOnlyFlaggedExport] = useState(false);
  const fileInputRef = useRef(null);
  const jsonFileInputRef = useRef(null);

  const load = async (q = '') => {
    setLoading(true);
    const data = await api.getCards({ search: q, setId });
    setCards(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newFront.trim()) return;
    await api.createCard(newFront, newBack, setId);
    setNewFront('');
    setNewBack('');
    load(search);
    onCardsChanged?.();
  };

  const handleBackChange = (id, back) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, back } : c)));
  };

  const handleBackSave = async (id, back) => {
    await api.updateCard(id, { back });
  };

  const handleDelete = async (id) => {
    await api.deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    onCardsChanged?.();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportMessage('');
    try {
      const { imported, skipped } = await api.importTelegram(file, setId);
      setImportMessage(`Importiert: ${imported}, übersprungen: ${skipped}`);
      load(search);
      onCardsChanged?.();
    } catch (err) {
      setImportMessage(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleJsonFileSelected = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setJsonImporting(true);
    setJsonMessage('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const cardsToImport = Array.isArray(parsed) ? parsed : parsed.cards;
      if (!Array.isArray(cardsToImport)) {
        throw new Error('Ungültiges JSON-Format');
      }
      const { imported, skipped } = await api.importJson(setId, cardsToImport);
      setJsonMessage(`Importiert: ${imported}, übersprungen: ${skipped}`);
      load(search);
      onCardsChanged?.();
    } catch (err) {
      setJsonMessage(err.message);
    } finally {
      setJsonImporting(false);
    }
  };

  const handleExportJson = () => {
    api.exportSetJson(setId, currentSet?.name, onlyFlaggedExport);
  };

  const handleExportPdf = () => {
    api.exportSetPdf(setId, onlyFlaggedExport).catch((err) => setJsonMessage(err.message));
  };

  const handleDeleteAll = async () => {
    if (cards.length === 0) return;
    if (!window.confirm(`Alle Karten löschen (${cards.length})? Dies kann nicht rückgängig gemacht werden.`)) return;
    await api.deleteAllCards(setId);
    setCards([]);
    onCardsChanged?.();
  };

  return (
    <div className="card-list">
      <div className="import-form">
        <input
          type="file"
          accept=".json,application/json"
          ref={fileInputRef}
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? 'Importiere...' : 'Telegram-Export auswählen'}
        </button>
        {importMessage && <span className="import-message">{importMessage}</span>}
        <button className="btn-delete-all" onClick={handleDeleteAll}>
          Alles löschen
        </button>
      </div>

      <div className="backup-form">
        <label className="only-flagged-toggle">
          <input
            type="checkbox"
            checked={onlyFlaggedExport}
            onChange={(e) => setOnlyFlaggedExport(e.target.checked)}
          />
          Nur unbekannte Wörter
        </label>
        <button onClick={handleExportJson}>JSON exportieren</button>
        <button onClick={handleExportPdf}>PDF exportieren</button>
        <input
          type="file"
          accept=".json,application/json"
          ref={jsonFileInputRef}
          onChange={handleJsonFileSelected}
          style={{ display: 'none' }}
        />
        <button onClick={() => jsonFileInputRef.current?.click()} disabled={jsonImporting}>
          {jsonImporting ? 'Importiere...' : 'JSON importieren'}
        </button>
        {jsonMessage && <span className="import-message">{jsonMessage}</span>}
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suche..." />
        <button type="submit">Suchen</button>
      </form>

      <form className="add-form" onSubmit={handleAdd}>
        <input value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="Wort" />
        <input
          value={newBack}
          onChange={(e) => setNewBack(e.target.value)}
          placeholder="Übersetzung (optional)"
        />
        <button type="submit">Hinzufügen</button>
      </form>

      {loading ? (
        <p>Wird geladen...</p>
      ) : (
        <div className="cards-table-wrapper">
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
                  <td data-label="Übersetzung">
                    <input
                      value={card.back || ''}
                      onChange={(e) => handleBackChange(card.id, e.target.value)}
                      onBlur={(e) => handleBackSave(card.id, e.target.value)}
                      placeholder="Übersetzung hinzufügen"
                    />
                  </td>
                  <td data-label="">
                    <button className="btn-delete" onClick={() => handleDelete(card.id)}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
