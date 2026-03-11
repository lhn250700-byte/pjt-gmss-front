import axios from 'axios';

export const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

function getAccessToken() {
  return (
    localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || ''
  );
}

export function getHeaders(userId = null) {
  const headers = { 'Content-Type': 'application/json' };

  const hasValidUserId = userId != null && String(userId).trim() !== '' && String(userId) !== 'anonymous';

  const xUserId = hasValidUserId
    ? String(userId).trim()
    : localStorage.getItem('dummyUser')
      ? (() => {
          try {
            const u = JSON.parse(localStorage.getItem('dummyUser'));
            return u?.id ?? 'anonymous';
          } catch {
            return 'anonymous';
          }
        })()
      : 'anonymous';

  headers['X-User-Id'] = xUserId;

  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

const axiosInstance = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 보낼 때 Authorization 자동 부착
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    config.headers = {
      ...(config.headers || {}),
      ...(getHeaders() || {}),
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 응답 에러 시 메시지 정리 후 throw
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    const msg = data?.error || data?.message || error.message || `HTTP ${error.response?.status || 'Error'}`;

    if (error.response) {
      console.error('[API Error]', error.response.status, error.config?.url, data);
    }

    throw new Error(msg);
  },
);

export default axiosInstance;
