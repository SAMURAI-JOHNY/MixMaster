import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

test('renders catalog heading', async () => {
  render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );
  expect(await screen.findByRole('heading', { name: /каталог коктейлей/i })).toBeInTheDocument();
});
