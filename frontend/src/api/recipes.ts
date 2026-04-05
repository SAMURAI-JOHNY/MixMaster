import api from './auth';

export const recipesAPI = {
  // Создать рецепт
  create: async (recipeData: Record<string, unknown>): Promise<any> => {
    const response = await api.post('/recipes/', recipeData);
    return response.data;
  },

  // Получить рецепт по ID
  getById: async (recipeId: number): Promise<any> => {
    const response = await api.get(`/recipes/${recipeId}`);
    return response.data;
  },

  // Получить рецепты по коктейлю
  getByCocktail: async (cocktailId: number): Promise<any> => {
    const response = await api.get(`/recipes/cocktail/${cocktailId}`);
    return response.data;
  },

  // Добавить ингредиент в рецепт
  addIngredient: async (
    recipeId: number,
    ingredientData: Record<string, unknown>,
  ): Promise<any> => {
    const response = await api.post(`/recipes/${recipeId}/ingredients`, ingredientData);
    return response.data;
  },

  // Завершить рецепт
  complete: async (recipeId: number): Promise<any> => {
    const response = await api.patch(`/recipes/${recipeId}/complete`);
    return response.data;
  },

  // Удалить рецепт
  delete: async (recipeId: number): Promise<any> => {
    const response = await api.delete(`/recipes/${recipeId}`);
    return response.data;
  },

  // Обновить рецепт
  update: async (
    recipeId: number,
    recipeData: Record<string, unknown>,
  ): Promise<any> => {
    const response = await api.put(`/recipes/${recipeId}`, recipeData);
    return response.data;
  },

  // Обновить ингредиенты рецепта
  updateIngredients: async (
    recipeId: number,
    ingredients: any,
  ): Promise<any> => {
    const response = await api.put(`/recipes/${recipeId}/ingredients`, ingredients);
    return response.data;
  },

  // Удалить ингредиент из рецепта
  removeIngredient: async (
    recipeId: number,
    ingredientId: number,
  ): Promise<any> => {
    const response = await api.delete(`/recipes/${recipeId}/ingredients/${ingredientId}`);
    return response.data;
  },
};

