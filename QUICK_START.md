# 🚀 Quick Start Guide - v2.0.0-beta

## 1. Запуск сервера глобальной базы данных

### Windows:
```bash
cd server
run.bat
```

Сервер запустится на: **http://localhost:8000**

### Linux/Mac:
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## 2. Установка расширения

1. **Откройте Chrome** и перейдите в `chrome://extensions/`
2. **Включите "Режим разработчика"** (Developer mode) в правом верхнем углу
3. **Нажмите "Загрузить распакованное расширение"** (Load unpacked)
4. **Выберите папку** `dist` из проекта

## 3. Настройка Global Database

1. **Откройте настройки расширения:**
   - Правый клик на иконку расширения → Options
   - ИЛИ перейдите в `chrome://extensions/` → найдите расширение → Details → Extension options

2. **Прокрутите до "Global Cheater Database"**

3. **Включите "Enable Global Database"** (переключатель)

4. **Укажите URL сервера:**
   ```
   http://localhost:8000
   ```

5. **Нажмите "Test Connection"**
   - Должно показать: ✓ Connected
   - Отобразится информация о сервере (версия, uptime, отчеты)

6. **Нажмите "Save Settings"**

## 4. Тестирование

### A. Проверка соединения
1. В Options page нажмите "🔍 Test Connection"
2. Должен появиться зелёный статус: **Connected ✓**
3. Должна отобразиться информация:
   - Status: healthy
   - Version: 2.0.0
   - Total Reports: 0
   - Uptime: 0:XX:XX

### B. API тесты через Swagger
1. Откройте в браузере: **http://localhost:8000/docs**
2. Попробуйте endpoints:
   - `GET /health` - должен вернуть healthy status
   - `POST /api/reports/submit` - отправьте тестовый отчёт
   - `GET /api/reports/player/{username}` - проверьте репутацию

### C. Тест отправки отчёта
```bash
curl -X POST http://localhost:8000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "username": "TestPlayer123",
    "risk_score": 85,
    "game_format": "blitz"
  }'
```

Ожидаемый ответ:
```json
{
  "success": true,
  "username": "TestPlayer123",
  "total_reports": 1,
  "confidence_level": "low"
}
```

## 5. Возможные проблемы

### Сервер не запускается
**Проблема:** Port already in use
**Решение:** Измените порт в `server/main.py` (строка `port=8000`)

### Расширение не подключается
**Проблема:** Connection failed (timeout)
**Решение:**
- Проверьте, что сервер запущен
- Попробуйте открыть http://localhost:8000/health в браузере
- Проверьте URL в настройках расширения

### CORS ошибки
**Решение:** Сервер уже настроен для работы с расширениями. Если проблема остаётся, проверьте консоль браузера (F12)

## 6. Что дальше?

После успешной настройки:
1. Играйте на Chess.com
2. Расширение автоматически будет проверять игроков в глобальной БД
3. При обнаружении подозрительных игроков увидите их репутацию
4. Ваши отчёты будут автоматически отправляться в БД

## 📊 Следующий этап: Statistics Tab

В следующей версии добавим вкладку Statistics с:
- Личной статистикой встреч
- Графиками рисков по времени
- Топ-10 подозрительных игроков
- Эффективность абортов

---

**Версия:** 2.0.0-beta
**Документация сервера:** `server/README.md`
**Тесты API:** `server/TESTING.md`
