# Username Onboarding and Validation SOP

## Objective
Implement reliable user identification through automatic username detection, storage, and validation to prevent incorrect opponent analysis.

## Overview
1. Automatic username detection on first game
2. Storage in extension settings
3. Username display and validation in popup
4. Options page integration
5. Game monitoring validation logic

## Implementation Details

### 1. Settings Storage Enhancement
**File**: `src/frontend/options/SettingsManager.js`
- Extend existing settings structure to include USER_USERNAME
- Maintain current storage key: 'chessRiskScore_settings'
- Update settings validation to include username string check
- Integrate with existing storage patterns

### 2. First-Game Username Detection
**File**: `src/frontend/components/GameMonitor.js`
- On game initialization, check SettingsManager for existing username
- If username is empty:
  - Capture first detected currentPlayer value
  - Use SettingsManager to store username
  - Log successful first-time detection
- Handle edge cases (game abort, page reload)

### 3. Popup UI Enhancement
**File**: `src/frontend/popup/popup.html`
- Add new section below risk score display:
  - Show current username
  - Add "Edit" link to options page
  - Include tooltip explaining username purpose
- Follow existing popup styling patterns
- Maintain current popup dimensions

### 4. Options Page Integration
**File**: `src/frontend/options/options.html`
- Add username field to existing settings group
- Include validation message
- Add "Reset Username" capability
- Maintain current options page layout and styling

### 5. Game Monitoring Validation
**File**: `src/frontend/components/GameMonitor.js`
- Before opponent analysis:
  1. Load stored username
  2. Compare against current game players
  3. If mismatch detected, eg opponent = stored username:
     - Swap currentPlayer and opponent roles
     - Log the correction
     - Continue with analysis
- Maintain existing game monitoring performance

## Component Integration

### Storage Service Integration
**File**: `src/frontend/services/StorageService.js`
- No direct modifications needed
- Will continue using existing storage patterns
- Username storage handled through SettingsManager

### Background Script Integration
**File**: `src/background.js`
- No modifications needed
- Will use existing message handling
- Username validation happens in GameMonitor

### Content Script Integration
**File**: `src/frontend/content.js`
- No modifications needed
- GameMonitor handles all username logic

## Testing Requirements

### Functional Testing
1. First-time User Flow:
   - Fresh install
   - First game detection
   - Username storage verification

2. Username Validation:
   - Correct role assignment
   - Role-switching accuracy
   - Edge case handling

3. Settings Management:
   - Manual username updates
   - Storage persistence
   - Reset functionality

### Integration Testing
1. Component Communication:
   - GameMonitor → SettingsManager
   - Popup → Options page
   - Content script → Background script

2. State Management:
   - Username persistence
   - Settings synchronization
   - Role validation

## Success Criteria
1. Automatic Detection:
   - First-time users get correct username stored
   - No user interaction required for initial setup

2. Validation Accuracy:
   - 100% accuracy in player role identification
   - Successful role-switching when needed

3. User Experience:
   - Clear username display in popup
   - Easy access to username editing
   - Intuitive options page integration

## Error Handling
1. Detection Failures:
   - Fallback to manual input
   - Clear error messaging
   - Logging for debugging

2. Storage Issues:
   - Default to safe state
   - Retry mechanisms
   - User notification

3. Validation Errors:
   - Conservative approach to role-switching
   - Detailed logging
   - Recovery mechanisms

## Documentation Updates
1. User Guide:
   - First-time setup process
   - Username management
   - Troubleshooting steps

2. Technical Documentation:
   - Storage schema updates
   - Validation logic
   - Component interaction

3. Debug Documentation:
   - New log messages
   - Testing scenarios
   - Common issues

## Implementation Timeline
1. Phase 1: Storage Enhancement
   - Update SettingsManager
   - Add validation logic
   - Test storage functionality

2. Phase 2: Detection Logic
   - Implement first-game detection
   - Add role validation
   - Test accuracy

3. Phase 3: UI Components
   - Update popup display
   - Enhance options page
   - Test user interactions

4. Phase 4: Testing & Documentation
   - Complete test suite
   - Update documentation
   - Final validation

## Additional Considerations
1. Performance Impact:
   - Minimal storage operations
   - Efficient validation checks
   - Optimized role-switching

2. Edge Cases:
   - Username changes on Chess.com
   - Multiple accounts
   - Network issues

3. Future Enhancements:
   - Multiple username support
   - Account switching
   - Sync capabilities