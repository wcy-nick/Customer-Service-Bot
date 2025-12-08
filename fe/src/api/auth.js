import { http, setTokens, clearTokens } from './http';

export async function login(username, password) {
  const data = await http('/api/auth/login', { method: 'POST', auth: false, body: { username, password } });
  if (data) {
    const access = data.accessToken || data.access_token || data.token || data.jwt || '';
    const refresh = data.refreshToken || data.refresh_token || '';
    if (access || refresh) setTokens(access, refresh);
  }
  return data;
}

export async function register(payload) {
  const body = {
    username: payload.username,
    email: payload.email,
    password: payload.password,
    display_name: payload.display_name || payload.username
  };
  return http('/api/auth/register', { method: 'POST', auth: false, body });
}

export async function logout() {
  try {
    await http('/api/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

export async function getProfile() {
  return http('/api/users/profile', { method: 'GET' });
}
