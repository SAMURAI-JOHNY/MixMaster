# Комплексное тестирование MixMaster (ЛР №5)

## 1. Тестовая модель

### 1.1 Критические пользовательские сценарии

| Сценарий | Уровни проверки |
|----------|-----------------|
| Просмотр каталога коктейлей, поиск, фильтры, пагинация | Frontend (RTL), Backend `/cocktails/query/`, E2E smoke |
| Открытие карточки рецепта, блок внешнего API | Backend внешний роут + мок, Frontend API-модуль, ручной E2E |
| Регистрация / вход / проверка токена | Backend интеграция `/auth/*` |
| Операции бармена (создание коктейля и т.д.) | Backend права 403, Frontend кнопка «Создать рецепт» по роли |
| Склад ингредиентов (только авторизованные) | Backend 401/403 без токена |
| SEO: sitemap, robots, JSON-LD | Backend интеграция, E2E API (опционально) |

### 1.2 Ключевые бизнес-правила

- Создание коктейля — только роль **бармен** (`403` для любителя).
- Список/запрос ингредиентов — только с **Bearer** токеном.
- Дубликат `username` при регистрации — `400`.
- Несуществующий коктейль — `404`.
- Некорректные query-параметры (например `sort_by`) — `422`.
- Внешний TheCocktailDB при сбое — ответ `200` с `degraded: true` (деградация).

### 1.3 Зоны повышенного риска

- **Аутентификация и роли** — отдельные интеграционные тесты + проверка UI для бармена.
- **Файлы / S3** — в автотестах проверяется валидация без реального MinIO; полный путь загрузки — ручной / E2E против docker-compose.
- **Внешние API** — модульные тесты `cocktaildb_client` с моком `httpx`; интеграция роутера с `unittest.mock.patch`.

## 2. Структура и именование

| Каталог / файл | Назначение |
|----------------|------------|
| `backend/tests/conftest.py` | Окружение SQLite (файл), фикстуры `client`, пользователи, токены |
| `backend/tests/unit/test_*.py` | Быстрые модульные тесты, маркер `@pytest.mark.unit` |
| `backend/tests/integration/test_*.py` | HTTP + БД, маркер `@pytest.mark.integration` |
| `frontend/src/**/*.test.tsx` | Компоненты и страницы (RTL) |
| `frontend/src/api/*.test.ts` | Клиентские обёртки API |
| `frontend/e2e/*.spec.ts` | Playwright, маркер длительных сценариев |

## 3. Запуск

### Backend

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests -v
pytest tests -m unit
pytest tests -m integration
pytest tests --cov=services --cov=api/routers --cov-report=term-missing
```

### Frontend (unit / integration RTL)

```bash
cd frontend
npm ci
npm run test:unit
npm run test:coverage
```

### E2E (Playwright)

```bash
cd frontend
npx playwright install
# Терминал 1: бэкенд и/или docker-compose; Терминал 2:
npm start
# Терминал 3:
npm run test:e2e
# Опционально проверка API SEO:
set E2E_API_BASE=http://127.0.0.1:8000
npm run test:e2e
```

Приложение в Docker на порту **8080**:

```bash
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080
set E2E_API_BASE=http://127.0.0.1:8080
npm run test:e2e
```

## 4. Метрики качества (п. 6 задания)

- **Покрытие backend** (пример команды `pytest tests --cov=services --cov=api/routers`): по выбранным пакетам обычно **~50%+** строк; `services/cocktaildb_client` и `external_cocktails` — полное покрытие в текущем наборе тестов; `upload` / `recieps` — низкое, подлежат расширению.
- **Покрытие frontend**: `npm run test:coverage`; в `package.json` заданы минимальные пороги `coverageThreshold` (стартовые, повышайте по мере добавления тестов).
- **Разделение скорости**: маркеры `pytest -m unit` / `pytest -m integration`; E2E — Playwright в `frontend/e2e/` (дольше, требуют поднятого сервера).

## 5. Итоговая проверка (п. 7)

- Прогон `pytest tests` и `npm run test:unit` без падений.
- E2E smoke при поднятом стеке.
- Ручная проверка загрузки файлов в MinIO при необходимости отчёта по ЛР.
