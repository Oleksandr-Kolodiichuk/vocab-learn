import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../api/client';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [48, 15];
const DEFAULT_ZOOM = 4;
const LABELS_KEY = 'vocab-learn:mapShowLabels';

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Leaflet measures its container once on mount; if the surrounding flex/responsive
// layout hasn't settled yet (common on mobile), the map can end up sized to 0.
// Re-measure whenever the container itself resizes so it always fills its box.
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    map.invalidateSize();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function WordMap({ setId }) {
  const [cards, setCards] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [error, setError] = useState('');
  const [showLabels, setShowLabels] = useState(() => localStorage.getItem(LABELS_KEY) !== 'false');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getCards({ setId }), api.getSetPins(setId)]).then(([cardsData, pinsData]) => {
      setCards(cardsData);
      setPins(pinsData);
      setLoading(false);
    });
  }, [setId]);

  useEffect(() => {
    localStorage.setItem(LABELS_KEY, showLabels);
  }, [showLabels]);

  const handleSelectCard = (id) => {
    setSelectedCardId((prev) => (prev === id ? null : id));
  };

  const handleMapClick = async (latlng) => {
    if (!selectedCardId) return;
    try {
      const pin = await api.placePin(setId, selectedCardId, latlng.lat, latlng.lng);
      const card = cards.find((c) => c.id === selectedCardId);
      setPins((prev) => [
        ...prev.filter((p) => p.card_id !== selectedCardId),
        { ...pin, front: card?.front, back: card?.back },
      ]);
      setSelectedCardId(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePin = async (pin) => {
    await api.deletePin(setId, pin.id);
    setPins((prev) => prev.filter((p) => p.id !== pin.id));
    if (selectedCardId === pin.card_id) setSelectedCardId(null);
  };

  const handlePinDragEnd = async (pin, e) => {
    const { lat, lng } = e.target.getLatLng();
    try {
      const updated = await api.placePin(setId, pin.card_id, lat, lng);
      setPins((prev) => prev.map((p) => (p.id === pin.id ? { ...p, lat: updated.lat, lng: updated.lng } : p)));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAllPins = async () => {
    if (pins.length === 0) return;
    if (!window.confirm(`Alle ${pins.length} Markierungen von der Karte entfernen?`)) return;
    await api.deleteAllPins(setId);
    setPins([]);
    setSelectedCardId(null);
  };

  if (loading) return <p className="loading-text">Wird geladen...</p>;

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <p>Noch keine Karten in diesem Set — füge zuerst Wörter hinzu, um sie auf der Karte zu platzieren</p>
      </div>
    );
  }

  const pinByCardId = new Map(pins.map((p) => [p.card_id, p]));
  const unpinnedCards = cards.filter((c) => !pinByCardId.has(c.id));
  const pinnedCards = cards.filter((c) => pinByCardId.has(c.id));

  return (
    <div className="word-map">
      <div className="word-map-sidebar">
        <p className="word-map-hint">
          {selectedCardId
            ? 'Klicke jetzt auf die Karte, um das Wort dort zu platzieren'
            : 'Wähle unten ein Wort aus, dann klicke auf die Karte. Gesetzte Pins kannst du direkt auf der Karte verschieben.'}
        </p>

        <div className="word-map-section">
          <div className="word-map-section-header">
            <span>Alle Wörter ({unpinnedCards.length})</span>
          </div>
          <div className="word-map-list">
            {unpinnedCards.length === 0 ? (
              <p className="word-map-list-empty">Alle Wörter sind bereits platziert 🎉</p>
            ) : (
              unpinnedCards.map((card) => (
                <div key={card.id} className={`word-map-item${selectedCardId === card.id ? ' selected' : ''}`}>
                  <button className="word-map-item-select" onClick={() => handleSelectCard(card.id)}>
                    <span className="word-map-item-front">{card.front}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="word-map-section">
          <div className="word-map-section-header">
            <span>Markiert ({pinnedCards.length})</span>
            <button
              className="word-map-clear-all"
              onClick={handleDeleteAllPins}
              disabled={pinnedCards.length === 0}
            >
              Alle entfernen
            </button>
          </div>
          <div className="word-map-list">
            {pinnedCards.length === 0 ? (
              <p className="word-map-list-empty">Noch keine Wörter platziert</p>
            ) : (
              pinnedCards.map((card) => {
                const pin = pinByCardId.get(card.id);
                return (
                  <div key={card.id} className="word-map-item pinned">
                    <button className="word-map-item-select" onClick={() => handleSelectCard(card.id)}>
                      <span className="word-map-item-front">{card.front}</span>
                    </button>
                    <button
                      className="word-map-pin-badge"
                      title="Markierung von der Karte entfernen"
                      onClick={() => handleDeletePin(pin)}
                    >
                      📍
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
      <div className="word-map-canvas-wrap">
        <div className="word-map-toolbar">
          <button
            className={`word-map-labels-toggle${showLabels ? ' active' : ''}`}
            onClick={() => setShowLabels((v) => !v)}
            title={showLabels ? 'Wörter auf der Karte verbergen (Quiz-Modus)' : 'Wörter auf der Karte anzeigen'}
          >
            {showLabels ? '👁️ Wörter anzeigen' : '🙈 Wörter verborgen'}
          </button>
        </div>
        <div className="word-map-canvas">
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onMapClick={handleMapClick} />
            <ResizeFix />
            {pins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                draggable
                eventHandlers={{ dragend: (e) => handlePinDragEnd(pin, e) }}
              >
                {showLabels && (
                  <Tooltip permanent direction="top" offset={[0, -32]} className="map-pin-label">
                    {pin.front}
                  </Tooltip>
                )}
                <Popup>
                  <div className="map-pin-popup">
                    <strong>{pin.front}</strong>
                    {pin.back && <div className="map-pin-popup-back">{pin.back}</div>}
                    <button onClick={() => handleDeletePin(pin)}>Löschen</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
