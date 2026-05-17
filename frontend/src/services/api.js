import axios from 'axios';
import { API_BASE_URL, API_FALLBACK_URL, API_MAX_RETRIES } from '../config/env.js';

// ── Circuit breaker ────────────────────────────────────────────────────────────
// primaryDown: true while backup is active. Every new request skips primary entirely.
// Probe runs only while backup is active, pinging primary every 2 min.
// When primary responds, circuit closes and probe stops.
let primaryDown = false;
let probeInterval = null;

// Listeners so React components can react to circuit state changes
const listeners = new Set();
export function onCircuitChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function isUsingFallback() { return primaryDown; }
function notifyListeners() { listeners.forEach(fn => fn(primaryDown)); }

const PRIMARY_HEALTH_URL = new URL(API_BASE_URL).origin + '/health';
const PROBE_INTERVAL_MS  = 2 * 60 * 1000; // 2 minutes

function startProbe() {
  if (probeInterval) return;
  probeInterval = setInterval(async () => {
    try {
      await fetch(PRIMARY_HEALTH_URL);
      primaryDown = false;
      clearInterval(probeInterval);
      probeInterval = null;
      notifyListeners();
    } catch {
      // still down — keep probing
    }
  }, PROBE_INTERVAL_MS);
}

const api = axios.create({ baseURL: API_BASE_URL });

// Axios interceptors are synchronous — read from localStorage directly.
// On native Capacitor, AuthContext pre-loads the token into localStorage via
// storage.js (which writes localStorage on web and Preferences on native).
// The sync read here is safe because the token is mirrored to localStorage
// by storage.set() on all platforms.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Circuit open — route straight to fallback, skip primary entirely
  if (primaryDown && API_FALLBACK_URL) {
    config.baseURL      = API_FALLBACK_URL;
    config._usedFallback = true;
  }
  return config;
});

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

    // Network error — only retry/fallback if still on primary
    if (!config._usedFallback) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < API_MAX_RETRIES) {
        config._retryCount++;
        return api(config);
      }

      // Primary exhausted — open circuit, start background probe, use fallback
      if (API_FALLBACK_URL) {
        primaryDown          = true;
        config._usedFallback = true;
        config.baseURL       = API_FALLBACK_URL;
        notifyListeners();
        startProbe();
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export const fetcher = (url) => api.get(url).then(res => res.data);
export default api;
