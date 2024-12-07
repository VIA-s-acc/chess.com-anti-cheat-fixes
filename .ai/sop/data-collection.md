# Data Collection SOP for Chess.com Risk Score Chrome Extension

## Objective
To retrieve necessary player information from Chess.com's public API using a username as input. This data will be used to calculate a risk score for identifying potential cheaters.

## Steps

1. **Access Player Profile**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}`
   - **Data Required**: 
     - `joined`: Timestamp of registration on Chess.com.

2. **Retrieve Player Statistics**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/stats`
   - **Data Required**:
     - For each game type (`chess_rapid`, `chess_bullet`, `chess_blitz`):
       - `last.rating`: Current rating.
       - `record.win`: Number of wins.
       - `record.loss`: Number of losses.
       - `record.draw`: Number of draws.
   - **Note**: Only consider `chess_rapid`, `chess_bullet`, and `chess_blitz` as they represent "real" chess formats.

3. **Gather Recent Game Data**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/games/{year}/{month}`
   - **Logic**: 
     - If the current date is the 15th or later, check only the current month.
     - If the current date is before the 15th, check both the current and previous month.
   - **Data Required**:
     - Identify the color the player played by the given username (e.g., `[White "timshott"]`).
     - `color.result`: Result of the game for the identified color.
     - `color.rating`: Rating of the user with given username
     - `time_class`: Ensure it is one of the desired formats (e.g., "blitz").
     - `accuracies`: Retrieve the accuracy for the identified color.
     - `rules`: Ensure it is "chess".

## Additional Notes
- Ensure that all API requests handle potential errors gracefully, such as network issues or invalid usernames.
- Consider caching results to minimize API calls for frequently queried usernames.
- The API does not require authentication, so ensure that requests are made responsibly to avoid rate limiting.

---

## Implementation Status and Updates

### API Interaction Enhancements ✅
1. **Retry Mechanism**
   - Added `fetchWithRetry` utility with exponential backoff
   - Configurable retry attempts (default: 3)
   - Smart retry only for 5xx and 429 errors
   - Exponential delays: 1s, 2s, 4s

2. **Error Handling**
   - Specific error handling for different HTTP status codes
   - Detailed error messages for debugging
   - Graceful fallbacks for missing data
   - Network error recovery

3. **Data Validation**
   - Profile data structure validation
   - Stats data completeness checks
   - Game data filtering and validation
   - Type checking for critical fields

### API Response Handling ✅
1. **Profile Data**
   - Validates `joined` timestamp
   - Handles missing or invalid data
   - Returns standardized profile object

2. **Statistics Data**
   - Filters relevant game formats
   - Handles optional rating data
   - Validates game counts
   - Returns normalized stats object

3. **Recent Games Data**
   - Smart date-based fetching
   - Parallel requests for efficiency
   - Proper game filtering
   - Data normalization

### Performance Optimizations
- Parallel API requests where possible
- Efficient data filtering
- Minimal data transformation
- Early validation to prevent unnecessary processing

### Notes:
- Original functionality preserved
- Added reliability improvements
- Enhanced error recovery
- Optimized for performance
- Maintains backward compatibility
