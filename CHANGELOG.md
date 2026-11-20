# Changelog

Все значимые изменения проекта документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

## [Unreleased]

### Added

- ЛР4: тесты контракта `POST /api/v1/cocktails/` (T-1 успех, T-2 ошибка 403) и unit-тесты `validate_file_meta`.
- Workflow `.github/workflows/pr-checks.yml` (pytest + Ruff на `pull_request` в `main`).
- Раздел «Тесты и проверки» в `README.md`, заметка `docs/lab4-ci.md`.

### Added (ранее)

- Структура репозитория курса (docs/, adr/, diagrams/).
- Паспорт проекта `docs/00-project.md` (лабораторная работа №1).
- Корневой `README.md` с разделом «Запуск» и протоколом проверки.
- Скрипт проверки работоспособности `scripts/smoke-check.ps1` / `scripts/smoke-check.sh`.
- Файл `LICENSE` (MIT).

## [0.1.0] — 2025

### Added

- Frontend (React) и backend (FastAPI) приложения MixMaster.
- Роли пользователей: бармен и любитель.
- Интеграция TheCocktailDB, SEO, S3/MinIO, Docker Compose, CI.
