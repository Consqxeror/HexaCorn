import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const API_ORIGIN = API_BASE_URL.replace(/\/?api\/?$/, '');

export function assetUrl(relativePath) {
  if (!relativePath) return '';
  const clean = String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '');
  return `${API_ORIGIN}/${clean}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hexacorn_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
