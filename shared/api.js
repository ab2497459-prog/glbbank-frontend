// Shared API helpers for frontend — backend-only mode
(function(window){
  const deployedApiUrl = 'https://glbbank-frontend.onrender.com/api';
  const origin = window.location.origin || '';
  const hasValidOrigin = origin.startsWith('http://') || origin.startsWith('https://');
  const API_BASE_URL = hasValidOrigin ? `${origin}/api` : deployedApiUrl;

  function getAuthHeaders() {
    const token = localStorage.getItem('glbbank_authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async function request(path, init = {}) {
    const url = `${API_BASE_URL}${path}`;
    try {
      const res = await fetch(url, { ...init, headers: { ...getAuthHeaders(), ...(init.headers || {}) } });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        return { ok: false, error: new Error(data && data.message ? data.message : `Request failed (${res.status})`) };
      }
      return { ok: true, data: normalizeIds(data) };
    } catch (err) {
      if (err instanceof TypeError) {
        return { ok: false, error: new Error(`Unable to reach backend at ${API_BASE_URL}. Is the server running?`) };
      }
      return { ok: false, error: err };
    }
  }

  function getJSON(path) {
    return request(path, { method: 'GET' });
  }

  function postJSON(path, body) {
    return request(path, { method: 'POST', body: JSON.stringify(body) });
  }

  function putJSON(path, body) {
    return request(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  function deleteJSON(path) {
    return request(path, { method: 'DELETE' });
  }

  function normalizeIds(payload) {
    if (!payload) return payload;
    if (Array.isArray(payload)) {
      return payload.map(item => normalizeIds(item));
    }
    if (typeof payload === 'object') {
      const out = { ...payload };
      if (out._id && !out.id) out.id = out._id;
      Object.keys(out).forEach(k => {
        if (Array.isArray(out[k])) out[k] = out[k].map(i => normalizeIds(i));
        else if (out[k] && typeof out[k] === 'object') out[k] = normalizeIds(out[k]);
      });
      return out;
    }
    return payload;
  }

  window.GLBBANK_API = { API_BASE_URL, getAuthHeaders, getJSON, postJSON, putJSON, deleteJSON };
})(window);
