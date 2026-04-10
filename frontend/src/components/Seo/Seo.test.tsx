import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { Seo } from './Seo';

describe('Seo', () => {
  it('sets document title and description', async () => {
    render(
      <HelmetProvider>
        <Seo title="Тестовая страница" description="Описание для SEO-теста." canonicalPath="/test" />
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.title).toContain('Тестовая страница');
    });
    await waitFor(() => {
      expect(document.title).toContain('MixMaster');
    });

    await waitFor(() => {
      // Helmet пишет мета-теги в document.head; отдельного RTL-query для meta[name] нет.
      // eslint-disable-next-line testing-library/no-node-access -- проверка SEO-метатега в head
      const metaDesc = document.querySelector('meta[name="description"]');
      expect(metaDesc?.getAttribute('content')).toBe('Описание для SEO-теста.');
    });
  });

  it('sets noindex when requested', async () => {
    render(
      <HelmetProvider>
        <Seo title="Скрытая" noindex />
      </HelmetProvider>,
    );

    await waitFor(() => {
      // eslint-disable-next-line testing-library/no-node-access -- проверка robots в head
      const robots = document.querySelector('meta[name="robots"]');
      expect(robots?.getAttribute('content')).toContain('noindex');
    });
  });
});
