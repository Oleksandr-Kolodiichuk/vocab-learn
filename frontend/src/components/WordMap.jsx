import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
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

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function WordMap({ setId }) {
  const [cards, setCards] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getCards({ setId }), api.getSetPins(setId)]).then(([cardsData, pinsData]) => {
      setCards(cardsData);
      setPins(pinsData);
      setLoading(false);
    });
  }, [setId]);

  const pinnedCardIds = useMemo(() => new Set(pins.map((p) => p.card_id)), [pins]);

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
  };

  if (loading) return <p className="loading-text">Wird geladen...</p>;

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <p>Noch keine Karten in diesem Set — füge zuerst Wörter hinzu, um sie auf der Karte zu platzieren</p>
      </div>
    );
  }

  return (
    <div className="word-map">
      <div className="word-map-sidebar">
        <p className="word-map-hint">
          {selectedCardId
            ? 'Klicke jetzt auf die Karte, um das Wort dort zu platzieren'
            : 'Wähle unten ein Wort aus, dann klicke auf die Karte'}
        </p>
        <div className="word-map-list">
          {cards.map((card) => (
            <button
              key={card.id}
              className={`word-map-item${selectedCardId === card.id ? ' selected' : ''}${
                pinnedCardIds.has(card.id) ? ' pinned' : ''
              }`}
              onClick={() => handleSelectCard(card.id)}
            >
              <span className="word-map-item-front">{card.front}</span>
              {pinnedCardIds.has(card.id) && (
                <span className="word-map-pin-badge" title="Bereits platziert">
                  📍
                </span>
              )}
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
      </div>
      <div className="word-map-canvas">
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={handleMapClick} />
          {pins.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]}>
              <Tooltip permanent direction="top" offset={[0, -32]} className="map-pin-label">
                {pin.front}
              </Tooltip>
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
  );
}
