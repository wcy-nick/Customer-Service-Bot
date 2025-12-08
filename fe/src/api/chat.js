import { http } from './http';

const API_BASE = process.env.REACT_APP_API_BASE || '';
function join(base, path) {
  if (path && (path.startsWith('http://') || path.startsWith('https://'))) return path;
  if (!base) return path;
  const b = base.replace(/\/+$/, '');
  let p = path || '';
  if (!p.startsWith('/')) p = '/' + p;
  if (b.endsWith('/api') && p.startsWith('/api/')) p = p.replace(/^\/api/, '');
  return b + p;
}

export const getSessions = async (params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await http(`/api/chat/sessions${qs}`);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const createSession = async (payload) => {
  return http('/api/chat/sessions', { method: 'POST', body: payload });
};

export const getSession = async (id) => {
  return http(`/api/chat/sessions/${id}`);
};

export const deleteSession = async (id) => {
  return http(`/api/chat/sessions/${id}`, { method: 'DELETE' });
};

export const updateSessionTitle = async (id, title) => {
  return http(`/api/chat/sessions/${id}/title`, { method: 'PUT', body: { title } });
};

export const getSessionMessages = async (id, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await http(`/api/chat/sessions/${id}/messages${qs}`);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const sendMessage = async (id, payload) => {
  return http(`/api/chat/sessions/${id}/messages`, { method: 'POST', body: payload });
};

export const sendMessageStream = async (id, payload, { onChunk, onDone, signal } = {}) => {
  const token = localStorage.getItem('accessToken') || '';
  const url = join(API_BASE, `/api/chat/sessions/${id}/messages`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload || {}),
    credentials: 'include',
    signal
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop();
    for (const part of parts) {
      const lines = part.split('\n');
      const dataLine = lines.find((l) => l.startsWith('data:')) || '';
      const jsonStr = dataLine.replace(/^data:\s*/, '');
      if (!jsonStr) continue;
      try {
        const evt = JSON.parse(jsonStr);
        if (evt?.type === 'chunk' && evt?.payload?.content) {
          onChunk && onChunk(evt.payload.content);
        } else if (evt?.type === 'done') {
          onDone && onDone(evt.payload || {});
        }
      } catch (e) {}
    }
  }
  onDone && onDone({});
};
