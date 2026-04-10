import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import MainPage from './MainPage';
import { authAPI } from '../../api/auth';
import { cocktailsAPI } from '../../api/cocktails';

jest.mock('../../api/cocktails', () => ({
  cocktailsAPI: {
    query: jest.fn(),
    getCategories: jest.fn(),
  },
}));

jest.mock('../../api/auth', () => ({
  authAPI: {
    verifyToken: jest.fn(),
  },
}));

const mockedQuery = cocktailsAPI.query as jest.MockedFunction<typeof cocktailsAPI.query>;
const mockedCategories = cocktailsAPI.getCategories as jest.MockedFunction<typeof cocktailsAPI.getCategories>;
const mockedVerify = authAPI.verifyToken as jest.MockedFunction<typeof authAPI.verifyToken>;

function renderMain(initialPath = '/') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <MainPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('MainPage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedQuery.mockResolvedValue({
      items: [],
      total: 0,
      pages: 0,
      page: 1,
      limit: 12,
    });
    mockedCategories.mockResolvedValue({ categories: [] });
    mockedVerify.mockRejectedValue(new Error('no token'));
  });

  it('shows catalog heading and loading then empty state', async () => {
    renderMain();
    expect(screen.getByRole('heading', { name: /каталог коктейлей/i })).toBeInTheDocument();
    expect(await screen.findByText(/нет коктейлей/i)).toBeInTheDocument();
    expect(mockedQuery).toHaveBeenCalled();
  });

  it('updates search query in URL when typing', async () => {
    renderMain('/');
    const input = await screen.findByPlaceholderText(/поиск коктейлей/i);
    await userEvent.type(input, 'moj');
    expect(input).toHaveValue('moj');
  });

  it('shows create recipe for bartender when token valid', async () => {
    localStorage.setItem('isLoggedIn', 'true');
    mockedVerify.mockResolvedValue({ valid: true, username: 'b', role: 'бармен' });
    renderMain();
    expect(await screen.findByRole('button', { name: /создать рецепт/i })).toBeInTheDocument();
  });

  it('does not show create recipe for guest', async () => {
    renderMain();
    await waitFor(() => expect(mockedQuery).toHaveBeenCalled());
    expect(mockedVerify).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /создать рецепт/i })).not.toBeInTheDocument();
  });

  it('shows error state when catalog request fails', async () => {
    mockedQuery.mockRejectedValue(new Error('network'));
    renderMain();
    expect(await screen.findByText(/не удалось загрузить коктейли/i)).toBeInTheDocument();
  });
});
