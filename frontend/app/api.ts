import axios from 'axios';

export const API = process.env.NEXT_PUBLIC_API_URL || 'https://talousanalyysisovellus-production.up.railway.app';

const TOKEN_KEY = 'talous_token';
const EMAIL_KEY = 'talous_email';

export const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
export const getEmail = () => (typeof window !== 'undefined' ? localStorage.getItem(EMAIL_KEY) : null);

export const saveSession = (token: string, email: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
};

// Axios-instanssi joka liittää Bearer-tokenin automaattisesti kirjautuneille pyynnöille.
export const api = axios.create({ baseURL: API });

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
