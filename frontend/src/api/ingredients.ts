import api from './auth';

export const ingredientsAPI = {
  query: async (params: {
    q?: string;
    min_volume?: number;
    max_volume?: number;
    sort_by?: 'name' | 'volume';
    sort_order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> => {
    const response = await api.get('/ingredients/query/', { params });
    return response.data;
  },

  // Получить все ингредиенты
  getAll: async (skip: number = 0, limit: number = 100): Promise<any> => {
    const response = await api.get('/ingredients/', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Получить ингредиент по ID
  getById: async (ingredientId: number): Promise<any> => {
    const response = await api.get(`/ingredients/${ingredientId}`);
    return response.data;
  },

  // Создать ингредиент
  create: async (ingredientData: Record<string, unknown>): Promise<any> => {
    const response = await api.post('/ingredients/', ingredientData);
    return response.data;
  },

  // Обновить ингредиент
  update: async (
    ingredientId: number,
    ingredientData: Record<string, unknown>,
  ): Promise<any> => {
    const response = await api.put(`/ingredients/${ingredientId}`, ingredientData);
    return response.data;
  },

  // Удалить ингредиент
  delete: async (ingredientId: number): Promise<any> => {
    const response = await api.delete(`/ingredients/${ingredientId}`);
    return response.data;
  },

  // Поиск ингредиентов
  search: async (params: Record<string, unknown> = {}): Promise<any> => {
    const response = await api.get('/ingredients/search/', { params });
    return response.data;
  },

  // Получить популярные ингредиенты
  getPopular: async (limit: number = 10): Promise<any> => {
    const response = await api.get('/ingredients/popular/', {
      params: { limit },
    });
    return response.data;
  },

  // Увеличить объем ингредиента
  increaseVolume: async (ingredientId: number, amount: number): Promise<any> => {
    const response = await api.post(
      `/ingredients/${ingredientId}/increase`,
      null,
      {
        params: { amount },
      },
    );
    return response.data;
  },

  // Уменьшить объем ингредиента
  decreaseVolume: async (ingredientId: number, amount: number): Promise<any> => {
    const response = await api.post(
      `/ingredients/${ingredientId}/decrease`,
      null,
      {
        params: { amount },
      },
    );
    return response.data;
  },

  // Массовое создание ингредиентов
  bulkCreate: async (ingredients: any[]): Promise<any> => {
    const response = await api.post('/ingredients/bulk/', ingredients);
    return response.data;
  },
};

