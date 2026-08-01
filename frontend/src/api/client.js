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

export const api = {
  getDueCards: (limit = 20) => request(`/review/due?limit=${limit}`),
  submitReview: (id, quality) =>
    request(`/review/${id}`, { method: 'POST', body: JSON.stringify({ quality }) }),
  getCards: (search = '') =>
    request(`/cards${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getFlaggedCards: () => request('/cards?flagged=true'),
  createCard: (front, back) =>
    request('/cards', { method: 'POST', body: JSON.stringify({ front, back }) }),
  updateCard: (id, patch) =>
    request(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  deleteAllCards: () => request('/cards/all', { method: 'DELETE' }),
  getStats: () => request('/stats'),
  importTelegram: () => request('/import/telegram', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  loginWithGoogle: (credential) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export { UnauthorizedError };
