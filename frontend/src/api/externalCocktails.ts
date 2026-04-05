import api from './auth';

export type ExternalCocktailItem = {
  external_id: string;
  name: string;
  thumb_url?: string | null;
  category?: string | null;
};

export type ExternalCocktailSearchResponse = {
  items: ExternalCocktailItem[];
  degraded: boolean;
  message?: string | null;
};

export const externalCocktailsAPI = {
  searchByName: async (name: string): Promise<ExternalCocktailSearchResponse> => {
    const response = await api.get<ExternalCocktailSearchResponse>('/external/cocktails/search-by-name', {
      params: { name },
    });
    return response.data;
  },
};
