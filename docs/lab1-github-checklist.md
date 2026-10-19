# Чеклист настроек GitHub (лабораторная работа №1)

Репозиторий: https://github.com/SAMURAI-JOHNY/MixMaster

Выполнить владельцу репозитория (через веб-интерфейс или `gh`).

## 1. Issue `product`

Заголовок: `product: MixMaster — паспорт и план семестра`

Тело — краткое содержание паспорта (см. `docs/00-project.md`):

- Собственный проект MixMaster (каталог коктейлей).
- Роли: бармен, любитель; внешний API TheCocktailDB.
- Сущности: User, Cocktail, Recipe, Ingredient, PreparedCocktail.
- Функции F1–F8; стек React + FastAPI + Postgres + MinIO.
- Команда: SAMURAI (индивидуально).
- Ссылка на репозиторий: https://github.com/SAMURAI-JOHNY/MixMaster

Issue **оставить открытым** до согласования задачи 5 с преподавателем, затем закрыть.

Преподавателю: доступ на чтение (и к issues / PR).

## 2. Метки issues

Создать метки (если ещё нет):

| Имя | Цвет (пример) | Описание |
|-----|---------------|----------|
| `review` | `#5319E7` | Замечание рецензента / преподавателя |
| `bug` | `#D73A4A` | Дефект |
| `change-request` | `#FBCA04` | Запрос на изменение (CR) |
| `question` | `#D876E3` | Вопрос / наблюдение |

## 3. Защита ветки `main`

Settings → Branches → Branch protection rule для `main`:

- Require a pull request before merging;
- запретить прямые push в `main` (включая администратора — по возможности).

## 4. Issues по наблюдениям (задача 4)

1. `question`: опечатка `recieps` в путях модулей.
2. `bug` или `question`: `/health` не проксируется через gateway.
3. `question`: сложность presigned URL / hostname MinIO для новичков.

## 5. После merge `lab-1`

```bash
git checkout main
git pull
git tag lab-1
git push origin lab-1
```
