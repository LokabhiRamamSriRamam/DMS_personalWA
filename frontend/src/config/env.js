// Centralized environment configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const API_FALLBACK_URL = import.meta.env.VITE_API_FALLBACK_URL || '';
export const API_MAX_RETRIES = 2;
export const WAHA_BASE_URL = import.meta.env.VITE_WA_BACKEND_BASE_URL || 'http://localhost:3001';
export const WAHA_API_KEY = import.meta.env.VITE_WAHA_API_KEY || '7815f971660642e094f8a0ca675967ed';
