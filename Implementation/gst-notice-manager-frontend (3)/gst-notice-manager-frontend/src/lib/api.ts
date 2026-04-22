import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") === "true";

export const TOKEN_KEY = "gst_auth_token";
export const USER_KEY = "gst_auth_user";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
