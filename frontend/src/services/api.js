import axios from 'axios';
import { API_BASE_URL, API_FALLBACK_URL, API_MAX_RETRIES } from '../config/env.js';

const api = axios.create({ baseURL: API_BASE_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry on network errors, fallback to secondary URL after primary retries exhausted
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;

    // 4xx/5xx — server responded, don't retry
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('dms_token');
        localStorage.removeItem('dms_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    // Network error / timeout — retry primary first
    config._retryCount = config._retryCount || 0;
    if (config._retryCount < API_MAX_RETRIES) {
      config._retryCount++;
      return api(config);
    }

    // Primary exhausted — try fallback once
    if (API_FALLBACK_URL && !config._usedFallback) {
      config._usedFallback = true;
      config.baseURL = API_FALLBACK_URL;
      return api(config);
    }

    return Promise.reject(error);
  }
);

export const fetcher = (url) => api.get(url).then(res => res.data);
export default api;
