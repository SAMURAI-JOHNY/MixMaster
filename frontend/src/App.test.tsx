import React from 'react';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

// Ускоряем lazy: без полного бандла страницы (SVG, цепочка axios) в e2e-стиле тестируем оболочку маршрута.
jest.mock('./pages/MainPage/MainPage', () => ({
  __esModule: true,
  default: function MainPageStub() {
    return <h1>Каталог коктейлей</h1>;
  },
}));

jest.mock('./pages/IngredientsPage/IngredientsPage', () => ({
  __esModule: true,
  default: () => <div>Ingredients stub</div>,
}));
jest.mock('./pages/CreateRecipePage/CreateRecipePage', () => ({
  __esModule: true,
  default: () => <div>Create stub</div>,
}));
jest.mock('./pages/RecipePage/RecipePage', () => ({
  __esModule: true,
  default: () => <div>Recipe stub</div>,
}));
jest.mock('./pages/MyPreparedPage/MyPreparedPage', () => ({
  __esModule: true,
  default: () => <div>Prepared stub</div>,
}));
jest.mock('./pages/EditCocktailPage/EditCocktailPage', () => ({
  __esModule: true,
  default: () => <div>Edit cocktail stub</div>,
}));
jest.mock('./pages/EditRecipePage/EditRecipePage', () => ({
  __esModule: true,
  default: () => <div>Edit recipe stub</div>,
}));
jest.mock('./pages/NotFoundPage/NotFoundPage', () => ({
  __esModule: true,
  default: () => <h1>404</h1>,
}));

test('после lazy-загрузки главная показывает каталог', async () => {
  render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );
  expect(await screen.findByRole('heading', { name: /каталог коктейлей/i })).toBeInTheDocument();
});
