# Лабораторная работа №4 — автоматические проверки

## Выбранный модуль

Операция из контракта ЛР3: **`POST /api/v1/cocktails/`** (`docs/interface-contract.md`, FR-4, US-5).

| Тест | Идентификатор | Что проверяет |
|------|---------------|---------------|
| Успех (бармен) | T-1 | HTTP 200, поля ответа, коктейль появляется в каталоге |
| Ошибка (любитель) | T-2 | HTTP 403, точный `detail`, запись не создаётся |

Дополнительно (локально, без внешнего S3): unit-тесты `validate_file_meta` — допустимый PNG и отказ по расширению.

## Workflow

Файл: `.github/workflows/pr-checks.yml`

- Событие: `pull_request` в `main` (`opened`, `synchronize`, `reopened`)
- Job `Backend tests` — pytest
- Job `Ruff lint` — дополнительная проверка качества кода

Полный CI (включая frontend и Docker) по-прежнему в `.github/workflows/ci.yml`.

## Локальный запуск

См. раздел «Тесты и проверки» в корневом `README.md`.
