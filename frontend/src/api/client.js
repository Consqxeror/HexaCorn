import axios from 'axios';

export const API_BASE_URL = '/api';

export const API_ORIGIN = '';

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
