import api from './auth';

export const cocktailsAPI = {
  query: async (params: {
    q?: string;
    category?: string;
    has_recipes?: boolean;
    sort_by?: 'name' | 'created_at' | 'category';
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
    const response = await api.get('/cocktails/query/', { params });
    return response.data;
  },

  // Получить все коктейли
  getAll: async (skip: number = 0, limit: number = 100): Promise<any> => {
    const response = await api.get('/cocktails/', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Получить коктейли с количеством рецептов
  getWithRecipes: async (skip: number = 0, limit: number = 100): Promise<any> => {
    const response = await api.get('/cocktails/with-recipes/', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Получить популярные коктейли
  getPopular: async (limit: number = 10): Promise<any> => {
    const response = await api.get('/cocktails/popular/', {
      params: { limit },
    });
    return response.data;
  },

  // Получить коктейль по ID
  getById: async (cocktailId: number): Promise<any> => {
    const response = await api.get(`/cocktails/${cocktailId}`);
    return response.data;
  },

  // Создать коктейль
  create: async (cocktailData: Record<string, unknown>): Promise<any> => {
    const response = await api.post('/cocktails/', cocktailData);
    return response.data;
  },

  // Обновить коктейль
  update: async (
    cocktailId: number,
    cocktailData: Record<string, unknown>,
  ): Promise<any> => {
    const response = await api.put(`/cocktails/${cocktailId}`, cocktailData);
    return response.data;
  },

  // Удалить коктейль
  delete: async (cocktailId: number): Promise<any> => {
    const response = await api.delete(`/cocktails/${cocktailId}`);
    return response.data;
  },

  // Поиск коктейлей
  search: async (params: Record<string, unknown> = {}): Promise<any> => {
    const response = await api.get('/cocktails/search/', { params });
    return response.data;
  },

  // Получить коктейли по категории
  getByCategory: async (category: string): Promise<any> => {
    const response = await api.get(`/cocktails/category/${category}`);
    return response.data;
  },

  // Получить коктейли без рецептов
  getWithoutRecipes: async (skip: number = 0, limit: number = 100): Promise<any> => {
    const response = await api.get('/cocktails/without-recipes/', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Получить статистику
  getStats: async (): Promise<any> => {
    const response = await api.get('/cocktails/stats/');
    return response.data;
  },

  // Получить список категорий
  getCategories: async (): Promise<any> => {
    const response = await api.get('/cocktails/categories/list/');
    return response.data;
  },
};

