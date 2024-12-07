# Game Detection Implementation SOP

## Objective
Implement reliable game detection for the Chess.com Risk Score Chrome Extension to automatically trigger risk assessment when a new game starts.

## Implementation Status

### Completed Components
1. ✅ Storage Service (`/frontend/services/StorageService.js`)
   - Manages game state in chrome.storage.local
   - Handles game ID extraction and popup trigger logic
   - Implements state management utilities

2. ✅ Game Monitor (`/frontend/components/GameMonitor.js`)
   - Monitors DOM changes for game events
   - Detects opponent username, moves, and game abort status
   - Manages MutationObserver for real-time updates

3. ✅ Content Script (`/frontend/content.js`)
   - Initializes game monitoring
   - Handles URL change detection
   - Manages component lifecycle

### Pending Components
1. 🔄 Background Script
   - Handle messages from content script
   - Manage popup window
   - Coordinate risk score calculation

2. 🔄 Message Service
   - Standardize message passing between components
   - Handle error cases
   - Implement retry logic for failed communications

## Technical Implementation Details

### Storage Schema
```javascript
{
  currentGameId: string,
  lastProcessedGameId: string,
  popupState: {
    isOpen: boolean,
    lastClosed: number
  },
  debug: boolean
}
```

### Component Communication Flow
1. Content Script detects URL change
2. GameMonitor observes DOM changes
3. StorageService manages state
4. Background Script coordinates actions

### State Management Rules
1. Show popup when:
   - New game ID detected
   - Current ID ≠ lastProcessedGameId
   - Popup not already open
   - No recent popup closure (>5s)

2. Close popup when:
   - Move detected
   - Game aborted
   - User navigates away

## Testing Scenarios
1. New game navigation
2. Same game refresh
3. Game abort detection
4. Move detection
5. Multiple rapid game switches

## Debug Considerations
- Log all game ID changes
- Track popup state transitions
- Monitor storage updates

## Next Steps
1. Implement Background Script
2. Create Message Service
3. Add comprehensive error handling
4. Implement debug mode toggles