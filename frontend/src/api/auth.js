import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Если токен недействителен, разлогиниваем пользователя
      localStorage.removeItem('access_token');
      localStorage.removeItem('username');
      localStorage.removeItem('isLoggedIn');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
    }
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  },
  
  logout: async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('isLoggedIn');
    return { message: 'Successfully logged out' };
  },
  
  verifyToken: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return { valid: false };
    
    try {
      const response = await api.post('/auth/verify-token');
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  },

  updateAvatar: async (avatarUrl) => {
    const response = await api.put('/auth/me/avatar', { avatar_url: avatarUrl });
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/me', profileData);
    return response.data;
  }
};

export default api;

