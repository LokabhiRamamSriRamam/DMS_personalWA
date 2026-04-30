import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
      // Only redirect if not already on the login page to avoid infinite reload loop
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url) => api.get(url).then(res => res.data);
export default api;
