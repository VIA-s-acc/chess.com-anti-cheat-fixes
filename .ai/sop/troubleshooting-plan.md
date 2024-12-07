# Troubleshooting Plan

## 1. Background Issues (PRIORITY)

### Expected Behavior
```
1. Game detection:
   [INFO] Game 127016394439 detected
   [INFO] Current user: timshott, Opponent: Helishooter

2. API Requests:
   [INFO] Fetching player data from https://api.chess.com/pub/player/Helishooter
   [INFO] Fetching stats from https://api.chess.com/pub/player/Helishooter/stats
   [INFO] Fetching games from https://api.chess.com/pub/player/Helishooter/games/2024/11

3. API Responses:
   [INFO] Received player data: {...}
   [INFO] Received stats: {...}
   [INFO] Received games: {...}

4. Processing:
   [INFO] Calculated metrics: {...}
   [INFO] Final risk score: 75% (High Risk)
   [DEBUG] Score breakdown: {...}
```

### Current Issues
1. ❌ Multiple detections of same opponent
2. ❌ Can't distinguish between user and opponent
3. ❌ Missing API calls
4. ❌ Excessive event triggering

### Fix Plan
1. Fix GameMonitor:
   - Cache current user detection
   - Add debouncing for opponent detection
   - Store opponent in state to prevent re-detection

2. Fix API Integration:
   - Re-enable API calls
   - Add request caching
   - Implement rate limiting

3. Fix Event Flow:
   - Add state tracking
   - Prevent duplicate events
   - Add event validation

## 2. UI Issues (NEXT)

### Current Issues
1. ❌ Small components
2. ❌ Missing styles
3. ❌ Static display
4. ❌ No loading states

### Fix Plan (After Background)
1. Update dimensions
2. Implement proper Tailwind styles
3. Add loading states
4. Add error states

## Implementation Order

1. Background (Phase 1):
   - Fix user/opponent detection
   - Add state management
   - Add event debouncing

2. Background (Phase 2):
   - Re-enable API integration
   - Add caching
   - Add rate limiting

3. UI (After Background Fixed):
   - Update styles
   - Add states
   - Improve UX 