import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_SECONDARY || '';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export default api;
