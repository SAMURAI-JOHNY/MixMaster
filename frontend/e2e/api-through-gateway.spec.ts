import { test, expect } from '@playwright/test';

/**
 * Проверка SEO-эндпоинтов на поднятом бэкенде (или полном docker-compose на :8080).
 * Без E2E_API_BASE тесты пропускаются.
 */
const apiBase = process.env.E2E_API_BASE;

test.describe('API / SEO (опционально)', () => {
  test('robots.txt доступен', async ({ request }) => {
    test.skip(!apiBase, 'Задайте E2E_API_BASE, например http://127.0.0.1:8000 или http://127.0.0.1:8080');
    const r = await request.get(`${apiBase!.replace(/\/$/, '')}/robots.txt`);
    expect(r.ok()).toBeTruthy();
    const text = await r.text();
    expect(text).toContain('Sitemap:');
  });

  test('sitemap.xml — XML', async ({ request }) => {
    test.skip(!apiBase);
    const r = await request.get(`${apiBase!.replace(/\/$/, '')}/sitemap.xml`);
    expect(r.ok()).toBeTruthy();
    const text = await r.text();
    expect(text).toContain('urlset');
  });
});
