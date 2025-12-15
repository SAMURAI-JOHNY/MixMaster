import api from './auth';

export const cocktailsAPI = {
  // Получить все коктейли
  getAll: async (skip = 0, limit = 100) => {
    const response = await api.get('/cocktails/', {
      params: { skip, limit }
    });
    return response.data;
  },

  // Получить коктейли с количеством рецептов
  getWithRecipes: async (skip = 0, limit = 100) => {
    const response = await api.get('/cocktails/with-recipes/', {
      params: { skip, limit }
    });
    return response.data;
  },

  // Получить популярные коктейли
  getPopular: async (limit = 10) => {
    const response = await api.get('/cocktails/popular/', {
      params: { limit }
    });
    return response.data;
  },

  // Получить коктейль по ID
  getById: async (cocktailId) => {
    const response = await api.get(`/cocktails/${cocktailId}`);
    return response.data;
  },

  // Создать коктейль
  create: async (cocktailData) => {
    const response = await api.post('/cocktails/', cocktailData);
    return response.data;
  },

  // Обновить коктейль
  update: async (cocktailId, cocktailData) => {
    const response = await api.put(`/cocktails/${cocktailId}`, cocktailData);
    return response.data;
  },

  // Удалить коктейль
  delete: async (cocktailId) => {
    const response = await api.delete(`/cocktails/${cocktailId}`);
    return response.data;
  },

  // Поиск коктейлей
  search: async (params = {}) => {
    const response = await api.get('/cocktails/search/', {
      params
    });
    return response.data;
  },

  // Получить коктейли по категории
  getByCategory: async (category) => {
    const response = await api.get(`/cocktails/category/${category}`);
    return response.data;
  },

  // Получить коктейли без рецептов
  getWithoutRecipes: async (skip = 0, limit = 100) => {
    const response = await api.get('/cocktails/without-recipes/', {
      params: { skip, limit }
    });
    return response.data;
  },

  // Получить статистику
  getStats: async () => {
    const response = await api.get('/cocktails/stats/');
    return response.data;
  },

  // Получить список категорий
  getCategories: async () => {
    const response = await api.get('/cocktails/categories/list/');
    return response.data;
  }
};

