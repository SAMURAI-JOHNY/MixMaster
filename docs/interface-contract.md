# Контракт программного интерфейса

| Поле | Значение |
|------|----------|
| Версия | 1.0 |
| Дата | 2026-11-17 |
| Ветка | `lab-3` |
| Операция | Создание коктейля |
| Метод и путь | `POST /api/v1/cocktails/` |
| Сценарий | US-5 |
| Требование | FR-4 |

---

## 1. Выбор интерфейса

### Назначение

Операция создаёт новый коктейль в каталоге MixMaster: название, описание, инструкция, категория и ссылка на изображение.

### Связь с ЛР2

- **US-5** — создание рецепта/коктейля барменом  
- **FR-4** — управление коктейлями и рецептами (бармен)  

В UI бармен заполняет форму (например, страница создания рецепта); фронтенд вызывает этот HTTP-метод. Сама операция создаёт сущность **коктейль**; рецепт и состав могут создаваться отдельными запросами.

### Реализация

| Часть | Где |
|-------|-----|
| HTTP-обработчик | `backend/api/routers/cocktails.py` → `create_cocktail` |
| Схема входа | `backend/schemas/cocktails.py` → `CocktailCreate` |
| Схема ответа | `backend/schemas/cocktails.py` → `CocktailBase` |
| Проверка роли | `backend/api/routers/auth.py` → `get_bartender_user` |
| Клиент UI | `frontend/src/api/cocktails.ts` → `cocktailsAPI.create` |

Операция **уже реализована**.

---

## 2. Контракт

### Кто вызывает и как

| | |
|--|--|
| Вызывающая сторона | Frontend MixMaster (или Postman / curl) от имени пользователя с ролью **бармен** |
| Базовый URL (Docker) | `http://localhost:8080` |
| Полный URL | `http://localhost:8080/api/v1/cocktails/` |
| Метод | `POST` |
| Заголовки | `Content-Type: application/json` |
| | `Authorization: Bearer <access_token>` |

Токен получают через `POST /api/v1/auth/login` (поле `access_token` в ответе). Без токена или с ролью «любитель» создание не выполняется.

### Входные данные (тело JSON)

Схема `CocktailCreate`:

| Поле | Тип | Обязательно | Допустимые значения / условия |
|------|-----|-------------|-------------------------------|
| `name` | string | да | непустое; уникально среди коктейлей |
| `description` | string \| null | нет | произвольный текст |
| `instructions` | string \| null | нет | текст приготовления |
| `image_url` | string \| null | нет | URL или `s3://…` после загрузки |
| `category` | string \| null | нет | например `"classic"` |

Условие вызова: действующий access token пользователя с `role = "бармен"`.

### Успешный результат

| | |
|--|--|
| HTTP-код | `200` |
| Тело | JSON объекта `CocktailBase` |

Поля ответа:

| Поле | Тип | Смысл |
|------|-----|--------|
| `id` | int | идентификатор созданной записи |
| `name` | string | название |
| `description` | string \| null | описание |
| `instructions` | string \| null | инструкция |
| `image_url` | string \| null | изображение |
| `category` | string \| null | категория |
| `created_at` | string (datetime) | время создания |

В базе появляется строка в таблице `cocktails`. Коктейль становится доступен в каталоге.

### Характерная ошибка: нет прав бармена

| | |
|--|--|
| Когда | токен есть, но роль пользователя — `любитель` (не `бармен`) |
| HTTP-код | `403` |
| Тело | `{"detail": "Only bartenders can perform this action"}` |
| Побочный эффект | запись в `cocktails` **не** создаётся |

Другие ошибки (для справки, не в примерах ниже): `401` без/с неверным токеном; `400`, если имя коктейля уже занято.

---

## 3. Примеры

### Пример 1 — успех

Предусловие: пользователь `bob` с ролью `бармен` вошёл в систему и имеет `access_token`.

**Запрос**

```http
POST /api/v1/cocktails/ HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example
```

```json
{
  "name": "Negroni",
  "description": "Классика на джине",
  "instructions": "Смешать в равных частях джин, кампари и красный вермут, подавать со льдом",
  "image_url": null,
  "category": "classic"
}
```

**Ожидаемый результат**

- код `200`
- в теле есть `id` (целое число), `name`: `"Negroni"`, `category`: `"classic"`
- `GET /api/v1/cocktails/` или каталог на сайте показывает «Negroni»

Пример тела ответа (значения `id` и `created_at` зависят от стенда):

```json
{
  "id": 12,
  "name": "Negroni",
  "description": "Классика на джине",
  "instructions": "Смешать в равных частях джин, кампари и красный вермут, подавать со льдом",
  "image_url": null,
  "category": "classic",
  "created_at": "2026-11-17T18:00:00"
}
```

### Пример 2 — ошибка 403

Предусловие: пользователь `alice` с ролью `любитель` вошёл в систему; коктейля с именем `Negroni` ещё нет (или имя любое новое).

**Запрос**

```http
POST /api/v1/cocktails/ HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.alice-token
```

```json
{
  "name": "Negroni",
  "description": "Классика на джине",
  "instructions": null,
  "image_url": null,
  "category": "classic"
}
```

**Ожидаемый результат**

- код `403`
- тело:

```json
{
  "detail": "Only bartenders can perform this action"
}
```

- коктейль «Negroni» **не** появляется в каталоге и в БД из‑за этого запроса

---

## Как проверить вручную

1. `docker compose up -d` → сайт `http://localhost:8080`
2. Зарегистрировать бармена и войти (или через `POST /api/v1/auth/login`)
3. Вызвать пример 1 (Postman / curl) с токеном бармена
4. Войти как любитель и повторить тело запроса — должен быть пример 2
