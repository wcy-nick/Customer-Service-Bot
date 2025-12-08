const API_BASE = process.env.REACT_APP_API_BASE || '';

let accessToken = localStorage.getItem('accessToken') || '';
let refreshToken = localStorage.getItem('refreshToken') || '';

export const setTokens = (access, refresh) => {
  accessToken = access || '';
  refreshToken = refresh || '';
  if (access) localStorage.setItem('accessToken', access);
  else localStorage.removeItem('accessToken');
  if (refresh) localStorage.setItem('refreshToken', refresh);
  else localStorage.removeItem('refreshToken');
};

export const clearTokens = () => {
  accessToken = '';
  refreshToken = '';
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

function join(base, path) {
  if (path && (path.startsWith('http://') || path.startsWith('https://'))) return path;
  if (!base) return path;
  const b = base.replace(/\/+$/, '');
  let p = path || '';
  if (!p.startsWith('/')) p = '/' + p;
  if (b.endsWith('/api') && p.startsWith('/api/')) p = p.replace(/^\/api/, '');
  return b + p;
}

export async function http(path, options = {}) {
  const { method = 'GET', headers = {}, body, auth = true } = options;
  const url = join(API_BASE, path);
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const reqHeaders = { Accept: 'application/json', ...headers };
  if (body && !isForm) reqHeaders['Content-Type'] = 'application/json';
  if (auth && accessToken) reqHeaders.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    mode: 'cors',
    credentials: 'include'
  });
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(join(API_BASE, '/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      const newAccess = data.accessToken || data.access_token || data.token || '';
      const newRefresh = data.refreshToken || data.refresh_token || refreshToken || '';
      setTokens(newAccess, newRefresh);
      return http(path, options);
    }
    clearTokens();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export async function httpBlob(path, { auth = true } = {}) {
  const url = join(API_BASE, path);
  const headers = {};
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { method: 'GET', headers, mode: 'cors', credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const ct = res.headers.get('content-type') || '';
  return { blob, contentType: ct };
}
