import { test, expect } from '@playwright/test';

test.describe('основные сценарии UI', () => {
  test('главная: заголовок каталога', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /каталог коктейлей/i })).toBeVisible();
  });

  test('поиск: поле ввода доступно', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/поиск коктейлей/i)).toBeVisible();
  });

  test('несуществующий маршрут: страница 404', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz');
    await expect(page.getByRole('heading', { name: /^404$/ })).toBeVisible();
  });
});
