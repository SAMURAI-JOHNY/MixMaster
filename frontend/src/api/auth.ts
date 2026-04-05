import axios, { AxiosError, AxiosRequestConfig } from 'axios';

/** В Docker за Nginx: REACT_APP_API_BASE_URL=/api/v1; локально — http://localhost:8000/api/v1 */
const API_URL =
  process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const clearAuthData = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('username');
  localStorage.removeItem('isLoggedIn');
};

type RetriableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = config.headers ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResponse = await refreshApi.post('/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = refreshResponse.data as {
            access_token?: string;
            refresh_token?: string;
          };

          if (access_token) {
            localStorage.setItem('access_token', access_token);
            originalRequest.headers = originalRequest.headers ?? {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (originalRequest.headers as any).Authorization = `Bearer ${access_token}`;
          }

          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }

          return api.request(originalRequest);
        } catch (refreshErr) {
          clearAuthData();
          window.location.href = '/';
          return Promise.reject(refreshErr);
        }
      }
    }

    if (error.response?.status === 401) {
      clearAuthData();
      window.location.href = '/';
    }

    return Promise.reject(error);
  },
);

type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type ProfileResponse = {
  id?: number;
  avatar_url?: string;
  role?: string;
  username?: string;
};

export const authAPI = {
  register: async (userData: Record<string, unknown>) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthTokenResponse> => {
    const response = await api.post<AuthTokenResponse>('/auth/login', { username, password });
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
    }
    return response.data;
  },

  getProfile: async (): Promise<ProfileResponse> => {
    const response = await api.get('/auth/me');
    return response.data as ProfileResponse;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  verifyToken: async (): Promise<{ valid: boolean; username?: string; role?: string }> => {
    const response = await api.get('/auth/verify');
    return response.data as { valid: boolean; username?: string; role?: string };
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // backend logout не критичен
    } finally {
      clearAuthData();
    }
    return { message: 'Successfully logged out' };
  },

  updateAvatar: async (avatarUrl: string) => {
    const response = await api.put('/auth/me/avatar', { avatar_url: avatarUrl });
    return response.data;
  },

  updateProfile: async (profileData: Record<string, unknown>) => {
    const response = await api.put('/auth/me', profileData);
    return response.data;
  },
};

export default api;

