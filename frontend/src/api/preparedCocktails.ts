import api from './auth';

export const preparedCocktailsAPI = {
  // Проверить достаточность ингредиентов для рецепта
  checkIngredients: async (recipeId: number, portions: number = 1): Promise<any> => {
    const response = await api.post(`/prepared-cocktails/check/${recipeId}`, { portions });
    return response.data;
  },

  // Приготовить коктейль из рецепта
  prepareCocktail: async (recipeId: number, portions: number = 1): Promise<any> => {
    const response = await api.post(`/prepared-cocktails/prepare/${recipeId}`, { portions });
    return response.data;
  },

  // Получить список приготовленных коктейлей пользователя
  getMyPreparedCocktails: async (skip: number = 0, limit: number = 100): Promise<any> => {
    const response = await api.get('/prepared-cocktails/my', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Проверить, был ли коктейль приготовлен
  checkIfPrepared: async (cocktailId: string | number): Promise<any> => {
    const response = await api.get(`/prepared-cocktails/check-prepared/${cocktailId}`);
    return response.data;
  },
};

