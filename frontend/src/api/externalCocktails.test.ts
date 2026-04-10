import api from './auth';
import { externalCocktailsAPI } from './externalCocktails';

jest.mock('./auth', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    defaults: { headers: {} },
  },
}));

const mockedGet = api.get as jest.MockedFunction<typeof api.get>;

describe('externalCocktailsAPI', () => {
  beforeEach(() => mockedGet.mockReset());

  it('searchByName requests backend and returns degraded payload', async () => {
    mockedGet.mockResolvedValue({
      data: { items: [], degraded: true, message: 'timeout' },
    });

    const res = await externalCocktailsAPI.searchByName('Margarita');

    expect(mockedGet).toHaveBeenCalledWith('/external/cocktails/search-by-name', {
      params: { name: 'Margarita' },
    });
    expect(res.degraded).toBe(true);
    expect(res.items).toEqual([]);
  });
});
