import api from './auth';

export const ingredientsAPI = {
  // Получить все ингредиенты
  getAll: async (skip = 0, limit = 100) => {
    const response = await api.get('/ingredients/', {
      params: { skip, limit }
    });
    return response.data;
  },

  // Получить ингредиент по ID
  getById: async (ingredientId) => {
    const response = await api.get(`/ingredients/${ingredientId}`);
    return response.data;
  },

  // Создать ингредиент
  create: async (ingredientData) => {
    const response = await api.post('/ingredients/', ingredientData);
    return response.data;
  },

  // Обновить ингредиент
  update: async (ingredientId, ingredientData) => {
    const response = await api.put(`/ingredients/${ingredientId}`, ingredientData);
    return response.data;
  },

  // Удалить ингредиент
  delete: async (ingredientId) => {
    const response = await api.delete(`/ingredients/${ingredientId}`);
    return response.data;
  },

  // Поиск ингредиентов
  search: async (params = {}) => {
    const response = await api.get('/ingredients/search/', {
      params
    });
    return response.data;
  },

  // Получить популярные ингредиенты
  getPopular: async (limit = 10) => {
    const response = await api.get('/ingredients/popular/', {
      params: { limit }
    });
    return response.data;
  },

  // Увеличить объем ингредиента
  increaseVolume: async (ingredientId, amount) => {
    const response = await api.post(`/ingredients/${ingredientId}/increase`, null, {
      params: { amount }
    });
    return response.data;
  },

  // Уменьшить объем ингредиента
  decreaseVolume: async (ingredientId, amount) => {
    const response = await api.post(`/ingredients/${ingredientId}/decrease`, null, {
      params: { amount }
    });
    return response.data;
  },

  // Массовое создание ингредиентов
  bulkCreate: async (ingredients) => {
    const response = await api.post('/ingredients/bulk/', ingredients);
    return response.data;
  }
};

