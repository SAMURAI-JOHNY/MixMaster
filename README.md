# MixMaster

Веб-приложение для каталога коктейлей и рецептов с ролями **бармен** и **любитель**, учётом приготовленных напитков и поиском во внешнем API [TheCocktailDB](https://www.thecocktaildb.com/).

| | |
|---|---|
| Репозиторий | https://github.com/SAMURAI-JOHNY/MixMaster |
| Лицензия | MIT |
| Паспорт проекта | [docs/00-project.md](docs/00-project.md) |
| Статус требований | Спецификация — лабораторная работа №2 (`docs/01-requirements.md`) |

## Запуск

Воспроизводимый запуск полного стека (Postgres, MinIO, API, SPA) — **не более пяти команд** от чистого клона.

### Предварительные требования

| Инструмент | Версия |
|------------|--------|
| Docker Desktop / Engine | 24+ (Compose V2) |
| Git | 2.x |
| (опционально) Python | 3.12+ — только для разработки backend без Docker |
| (опционально) Node.js | 20 LTS — только для разработки frontend без Docker |

Зависимости приложения зафиксированы:

- backend: `backend/requirements.txt`, `backend/requirements-dev.txt` (точные версии);
- frontend: `frontend/package-lock.json`.

### Установка и запуск (Docker)

```bash
git clone https://github.com/SAMURAI-JOHNY/MixMaster.git
cd MixMaster
cp .env.example .env
docker compose up --build -d
```

На Windows PowerShell вместо `cp` используйте:

```powershell
Copy-Item .env.example .env
```

После старта:

- сайт: http://localhost:8080  
- MinIO API: http://127.0.0.1:9000 (консоль: :9001)

Остановка: `docker compose down`.

### Проверка работоспособности

Сценарий (2–3 шага):

1. Открыть http://localhost:8080 — отображается главная страница каталога.
2. Запросить список коктейлей: http://localhost:8080/api/v1/cocktails/ — ответ JSON, код 200.
3. (опционально) Зарегистрироваться через UI и открыть карточку рецепта.

Скрипт проверки:

```powershell
# PowerShell (Windows)
.\scripts\smoke-check.ps1
```

```bash
# Bash (Linux/macOS/Git Bash)
chmod +x scripts/smoke-check.sh
./scripts/smoke-check.sh
```

Скрипт проверяет доступность SPA и API каталога коктейлей.

### Локальная разработка без полного Compose

Кратко: см. [README_SETUP.md](README_SETUP.md) (venv backend) и `frontend/README.md`. Для API обычно нужны Postgres/MinIO из compose либо SQLite (по умолчанию в `backend/database/database.py`).

## Протокол проверки запуска

| Дата | ОС | Кто проверял | Результат |
|------|-----|--------------|-----------|
| 2026-10-20 | Windows 10 (10.0.19045), Docker 29.6.1 | SAMURAI (автор) | Инструкция Compose и smoke-скрипт подготовлены; повторная проверка на второй машине / чистой VM — после настройки окружения рецензента |

> Для зачёта задачи 3 рекомендуется повторно прогнать `docker compose up --build -d` и `scripts/smoke-check.*` на машине другого участника либо в чистой VM/контейнере и дописать строку в таблицу.

## Документация курса

| Файл | Содержание |
|------|------------|
| [docs/00-project.md](docs/00-project.md) | Паспорт, структура, карта функций, практики, план |
| [docs/01-requirements.md](docs/01-requirements.md) | Требования (ЛР2) |
| [docs/02-validation.md](docs/02-validation.md) | Валидация (ЛР3) |
| [docs/03-architecture.md](docs/03-architecture.md) | Архитектура (ЛР4) |
| [docs/04-testing.md](docs/04-testing.md) | Тестирование (ЛР5) |
| [docs/05-deployment.md](docs/05-deployment.md) | Выпуск (ЛР6) |
| [CHANGELOG.md](CHANGELOG.md) | История изменений |

## Структура репозитория

```
README.md, CHANGELOG.md, LICENSE, docker-compose.yml
docs/          паспорт и артефакты курса
docs/adr/      архитектурные решения
docs/diagrams/ диаграммы
frontend/      исходники клиента (см. также src/README.md)
backend/       исходники API
scripts/       smoke-проверка запуска
src/, tests/   указатели на фактические каталоги кода и тестов
```

## Ветвление (правила курса)

- Работа ЛР *N* — ветка `lab-N`, слияние в `main` через Pull Request.
- После слияния — тег `lab-N`.
- С ЛР2 в коммитах, issues и тестах используются идентификаторы `UR-n`, `FR-n`, `NFR-n`, `CR-n`, `T-n`.
