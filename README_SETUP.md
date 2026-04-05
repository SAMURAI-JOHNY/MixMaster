# Настройка виртуального окружения

## Создание виртуального окружения в backend

Если виртуальное окружение еще не создано:

1. **Перейдите в директорию backend**:
   ```powershell
   cd backend
   ```

2. **Создайте виртуальное окружение**:
   ```powershell
   python -m venv .venv
   ```
   
   Если это не работает, попробуйте:
   ```powershell
   py -m venv .venv
   ```
   или
   ```powershell
   python3 -m venv .venv
   ```

3. **Активируйте виртуальное окружение**:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   
   Если получаете ошибку о политике выполнения, выполните:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Затем снова попробуйте активировать.

4. **Установите зависимости**:
   ```powershell
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```

5. **Запустите сервер**:
   ```powershell
   python -m uvicorn main:app --reload
   ```

## Использование виртуального окружения из backend

1. **Деактивируйте текущее виртуальное окружение** (если активно):
   ```powershell
   deactivate
   ```

2. **Перейдите в директорию backend**:
   ```powershell
   cd backend
   ```

3. **Активируйте виртуальное окружение из backend**:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

4. **Запустите сервер**:
   ```powershell
   python -m uvicorn main:app --reload
   ```

## Альтернативный способ (без активации)

Можно запускать сервер напрямую через Python из backend/.venv:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

## Удаление корневого .venv (если нужно)

Если корневое виртуальное окружение больше не нужно:

1. **Закройте все терминалы и процессы**, использующие это окружение
2. **Удалите директорию**:
   ```powershell
   Remove-Item -Recurse -Force .\.venv
   ```

## Проверка активного окружения

Чтобы проверить, какое виртуальное окружение активно:
```powershell
python -c "import sys; print(sys.executable)"
```

Должно показать путь к `backend\.venv\Scripts\python.exe`

