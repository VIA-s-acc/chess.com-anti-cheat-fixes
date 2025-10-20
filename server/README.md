# Chess Anti-Cheat Global Database Server

Python FastAPI сервер для краудсорсинговой базы данных подозрительных игроков Chess.com.

## 🚀 Быстрый старт

### Установка зависимостей

```bash
# Создать виртуальное окружение (опционально)
python -m venv venv

# Активировать виртуальное окружение
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt
```

### Запуск сервера

```bash
python main.py
```

Сервер запустится на `http://localhost:8000`

## 📖 API Endpoints

### Health Check
```
GET /health
```
Проверка доступности сервера. Используется расширением для определения, подключен ли сервер.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": "0:05:23",
  "total_reports": 42,
  "last_updated": "2025-10-20T15:30:00"
}
```

### Submit Report
```
POST /api/reports/submit
```
Отправить отчет о подозрительном игроке.

**Body:**
```json
{
  "username": "SuspiciousPlayer",
  "risk_score": 85.5,
  "game_format": "blitz",
  "factors": {
    "winRate": 92,
    "accuracy": 95
  },
  "notes": "Suspiciously high accuracy in multiple games"
}
```

### Get Player Reputation
```
GET /api/reports/player/{username}
```
Получить репутацию игрока из базы данных.

**Response:**
```json
{
  "found": true,
  "username": "SuspiciousPlayer",
  "total_reports": 5,
  "average_risk_score": 87.3,
  "confidence_level": "high",
  "first_reported": "2025-10-15T10:00:00",
  "last_reported": "2025-10-20T15:30:00",
  "report_count_by_format": {
    "blitz": 3,
    "rapid": 2
  },
  "is_banned": false
}
```

### Search Suspicious Players
```
GET /api/reports/search?min_reports=3&min_risk_score=70&limit=50
```
Поиск подозрительных игроков по критериям.

**Query Parameters:**
- `min_reports` (default: 3) - минимальное количество отчетов
- `min_risk_score` (default: 60.0) - минимальный риск-скор
- `confidence` (optional) - уровень уверенности: low, medium, high, confirmed
- `limit` (default: 100) - максимальное количество результатов

### Global Statistics
```
GET /api/statistics/global
```
Глобальная статистика базы данных.

**Response:**
```json
{
  "total_reports": 150,
  "total_unique_players": 45,
  "total_confirmed_cheaters": 8,
  "reports_last_24h": 12,
  "reports_last_7d": 67,
  "top_reported_players": [
    {
      "username": "TopSuspect",
      "total_reports": 15,
      "average_risk_score": 92.5,
      "confidence_level": "confirmed"
    }
  ]
}
```

## 🔧 Конфигурация

### Порт сервера
По умолчанию: `8000`

Изменить в `main.py`:
```python
uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8000,  # <-- измените здесь
    reload=True
)
```

### Хранение данных
По умолчанию данные хранятся в папке `./data/`:
- `reports.json` - все отчеты
- `statistics.json` - статистика

Для production рекомендуется использовать PostgreSQL или MongoDB.

## 📊 Уровни уверенности (Confidence Levels)

- **low**: 1-2 отчета, средний риск 50-70%
- **medium**: 3+ отчетов, средний риск 60-80%
- **high**: 5+ отчетов, средний риск 70-90%
- **confirmed**: 10+ отчетов, средний риск 80%+ ИЛИ игрок забанен Chess.com

## 🔒 Безопасность

**Важно для production:**

1. Добавьте аутентификацию (API keys, JWT)
2. Rate limiting для предотвращения спама
3. Валидацию данных
4. HTTPS соединение
5. Ограничьте CORS только для вашего расширения

## 📝 Интеграция с расширением

В настройках расширения укажите URL сервера:
```
http://localhost:8000
```

Расширение автоматически проверит доступность через `/health` endpoint.

## 🧪 Тестирование

### Curl примеры

Health check:
```bash
curl http://localhost:8000/health
```

Submit report:
```bash
curl -X POST http://localhost:8000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "username": "TestPlayer",
    "risk_score": 75,
    "game_format": "blitz"
  }'
```

Get player:
```bash
curl http://localhost:8000/api/reports/player/TestPlayer
```

## 📖 API Documentation

После запуска сервера откройте:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🛠️ Development

### Hot reload
Сервер автоматически перезагружается при изменении кода (благодаря `reload=True`).

### Логи
Все запросы логируются в консоль.

## ❓ FAQ

**Q: Как сбросить базу данных?**
A: Удалите файлы в папке `./data/`

**Q: Можно ли использовать PostgreSQL?**
A: Да, замените file-based storage на SQLAlchemy с PostgreSQL

**Q: Как защитить от спама?**
A: Добавьте rate limiting (например, с помощью slowapi) и требуйте API ключи
