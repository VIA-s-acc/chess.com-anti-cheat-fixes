# Message Handling System SOP

## Objective
Implement a reliable message passing system between different components of the Chess.com Risk Score Chrome Extension.

## Components Overview

### 1. Message Service (`/frontend/services/MessageService.js`)
- Provides standardized methods for inter-component communication
- Handles error cases and retries
- Implements message validation
- Includes comprehensive test coverage

### 2. Message Types and Schemas
```javascript
{
    gameStateChanged: {
        required: ['updateType', 'data', 'timestamp'],
        updateTypes: ['opponent_detected', 'moves_updated', 'game_aborted']
    },
    showPopup: {
        required: ['gameId']
    },
    calculateRisk: {
        required: ['data'],
        dataRequired: ['username']
    },
    updateRiskScore: {
        required: ['data']
    },
    closePopup: {
        required: []
    }
}
```

### 3. Test Coverage (`/frontend/services/__tests__/MessageService.test.js`)
- Message validation
- Retry mechanism
- Error handling
- Chrome API interaction

## Testing Instructions

1. Run the test suite:
```bash
npm test MessageService
```

2. Manual Testing Scenarios:
   - Send valid messages between components
   - Verify error handling with invalid messages
   - Test retry mechanism with network failures
   - Verify debug mode logging
   - Test race condition handling

## Debug Mode Integration
- Add comprehensive logging for all message operations
- Track message flow between components
- Log validation errors and retry attempts

## Next Steps
1. Complete debug mode integration
2. Integrate with popup UI
3. Add end-to-end testing
4. Document common debugging scenarios