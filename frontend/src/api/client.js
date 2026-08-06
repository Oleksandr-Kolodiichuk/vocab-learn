const BASE = import.meta.env.VITE_API_URL || '/api';

class UnauthorizedError extends Error {}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) throw new UnauthorizedError('unauthorized');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') usp.set(key, value);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function downloadBlob(path) {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (res.status === 401) throw new UnauthorizedError('unauthorized');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'download';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  getDueCards: (limit = 20) => request(`/review/due?limit=${limit}`),
  submitReview: (id, quality) =>
    request(`/review/${id}`, { method: 'POST', body: JSON.stringify({ quality }) }),
  getCards: ({ search = '', setId } = {}) => request(`/cards${buildQuery({ search, setId })}`),
  getFlaggedCards: (setId) => request(`/cards${buildQuery({ flagged: 'true', setId })}`),
  createCard: (front, back, setId) =>
    request('/cards', { method: 'POST', body: JSON.stringify({ front, back, setId }) }),
  updateCard: (id, patch) =>
    request(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  deleteAllCards: (setId) => request(`/cards/all${buildQuery({ setId })}`, { method: 'DELETE' }),
  importJson: (setId, cards) =>
    request('/cards/import-json', { method: 'POST', body: JSON.stringify({ setId, cards }) }),
  getStats: (setId) => request(`/stats${buildQuery({ setId })}`),
  importTelegram: async (file, setId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('setId', setId);
    const res = await fetch(`${BASE}/import/telegram`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (res.status === 401) throw new UnauthorizedError('unauthorized');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  getSets: () => request('/sets'),
  createSet: (name) => request('/sets', { method: 'POST', body: JSON.stringify({ name }) }),
  renameSet: (id, name) => request(`/sets/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteSet: (id) => request(`/sets/${id}`, { method: 'DELETE' }),
  exportSetPdf: (setId, onlyFlagged) =>
    downloadBlob(`/sets/${setId}/export-pdf${buildQuery({ onlyFlagged: onlyFlagged ? 'true' : '' })}`),
  exportSetJson: async (setId, setName, onlyFlagged) => {
    const cards = await api.getCards({ setId });
    const filtered = onlyFlagged ? cards.filter((c) => c.flagged) : cards;
    const payload = {
      set: setName,
      exportedAt: new Date().toISOString(),
      cards: filtered.map((c) => ({ front: c.front, back: c.back, flagged: c.flagged })),
    };
    const safeName = (setName || 'set').replace(/[^\p{L}\p{N}_-]+/gu, '_');
    downloadJson(`${safeName}.json`, payload);
  },
  getSetPins: (setId) => request(`/sets/${setId}/pins`),
  placePin: (setId, cardId, lat, lng) =>
    request(`/sets/${setId}/pins`, { method: 'POST', body: JSON.stringify({ cardId, lat, lng }) }),
  deletePin: (setId, pinId) => request(`/sets/${setId}/pins/${pinId}`, { method: 'DELETE' }),
  getMe: () => request('/auth/me'),
  loginWithGoogle: (credential) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export { UnauthorizedError };
