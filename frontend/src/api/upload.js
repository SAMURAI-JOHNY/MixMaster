import api from './auth';

const API_URL = 'http://localhost:8000/api/v1';

export const uploadAPI = {
  // Загрузить аватарку
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки аватарки');
    }
    
    return response.json();
  },

  // Загрузить изображение коктейля
  uploadCocktailImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload/cocktail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки изображения');
    }
    
    return response.json();
  },

  // Загрузить изображение ингредиента
  uploadIngredientImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload/ingredient`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки изображения');
    }
    
    return response.json();
  },

  // Получить URL изображения
  getImageUrl: (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url}`;
  }
};

