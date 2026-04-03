import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const state = JSON.parse(localStorage.getItem('auth-store') || '{}');
    const token = state?.state?.accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - auto refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const state = JSON.parse(localStorage.getItem('auth-store') || '{}');
        const refreshToken = state?.state?.refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        // Update store
        const stored = JSON.parse(localStorage.getItem('auth-store') || '{}');
        if (stored.state) {
          stored.state.accessToken = data.accessToken;
          stored.state.refreshToken = data.refreshToken;
          localStorage.setItem('auth-store', JSON.stringify(stored));
        }

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (_) {
        localStorage.removeItem('auth-store');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
