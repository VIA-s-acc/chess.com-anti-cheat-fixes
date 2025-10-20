# 🧪 Testing the Global Database Server

## Quick Start

1. **Start the server:**
```bash
cd server
python main.py
```

2. **Server should start on:** `http://localhost:8000`

## Test Endpoints

### 1. Health Check
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": "0:00:05",
  "total_reports": 0,
  "last_updated": null
}
```

### 2. Submit a Test Report
```bash
curl -X POST http://localhost:8000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "username": "TestCheater123",
    "risk_score": 85.5,
    "game_format": "blitz",
    "notes": "Suspiciously high accuracy"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "username": "TestCheater123",
  "total_reports": 1,
  "confidence_level": "low"
}
```

### 3. Get Player Reputation
```bash
curl http://localhost:8000/api/reports/player/TestCheater123
```

**Expected response:**
```json
{
  "found": true,
  "username": "TestCheater123",
  "total_reports": 1,
  "average_risk_score": 85.5,
  "confidence_level": "low",
  "report_count_by_format": {
    "blitz": 1
  },
  "is_banned": false
}
```

### 4. Submit Multiple Reports (to test confidence levels)
```bash
# Submit 5 reports for the same player
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/reports/submit \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"SerialCheater\",
      \"risk_score\": $((80 + i)),
      \"game_format\": \"rapid\"
    }"
  echo ""
done
```

Then check confidence level:
```bash
curl http://localhost:8000/api/reports/player/SerialCheater
```

Should show `"confidence_level": "high"`

### 5. Search for Suspicious Players
```bash
curl "http://localhost:8000/api/reports/search?min_reports=1&min_risk_score=70"
```

### 6. Get Global Statistics
```bash
curl http://localhost:8000/api/statistics/global
```

## Interactive Testing with Swagger UI

Open in browser:
```
http://localhost:8000/docs
```

You can test all endpoints interactively!

## Integration with Extension

1. **Start the server** (if not running)
2. **Open extension options** (right-click extension icon → Options)
3. **Enter server URL:** `http://localhost:8000`
4. **Enable global database**
5. **Check connection status** (should show "Connected ✓")

Now when you analyze a player:
- Extension will check global database
- If player is reported, you'll see global reputation
- Your reports will be submitted to the database

## Common Issues

### Port Already in Use
```
Error: [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000)
```

**Solution:** Change port in `main.py` or kill the process using port 8000

### CORS Errors in Extension
**Solution:** Server already has CORS enabled for all origins. If issues persist, check browser console for details.

### Database File Locked
**Solution:** Close any running server instances and delete `./data/*.json` to start fresh

## Data Management

### View Current Data
```bash
# Windows PowerShell
Get-Content server\data\reports.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Linux/Mac
cat server/data/reports.json | python -m json.tool
```

### Reset Database
```bash
# Delete data files
rm -rf server/data/*.json  # Linux/Mac
del /q server\data\*.json  # Windows
```

Server will recreate empty files on next startup.

## Next Steps

- Add more test data
- Test with multiple reporters
- Verify confidence level calculations
- Test mark-banned endpoint
- Integrate with extension

Happy testing! 🎯
