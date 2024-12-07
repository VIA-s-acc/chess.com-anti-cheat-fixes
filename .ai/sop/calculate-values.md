# Calculate Player Metrics SOP for Chess.com Risk Score Chrome Extension

## Objective
To calculate various player metrics using data from Chess.com's public API based on a given username.

## Steps

1. **Fetch Current Rating in All Formats**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/stats`
   - **Data Required**: 
     - `last.rating` for each format: `chess_rapid`, `chess_blitz`, `chess_bullet`.

2. **Calculate Account Age**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}`
   - **Data Required**: 
     - `joined`: Calculate account age as `today's date - joined date`.

3. **Calculate Overall Winrate in Each Format**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/stats`
   - **Data Required**:
     - Formula: 
       \[
       \text{Winrate} = \frac{\text{record.win}}{\text{record.win} + \text{record.loss} + \text{record.draw}}
       \]
   - Calculate separately for `chess_rapid`, `chess_blitz`, `chess_bullet`.

4. **Count Wins, Losses, Draws Overall in Each Format**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/stats`
   - **Data Required**:
     - `record.win`, `record.loss`, `record.draw` for each format.

5. **Calculate Latest Games Winrate in Each Format**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/games/{year}/{month}`
   - **Logic**: Analyze games from the last 15-45 days.
   - **Data Required**:
     - Calculate winrate using:
       \[
       \text{Recent Winrate} = \frac{\text{Recent Wins}}{\text{Recent Wins} + \text{Recent Losses} + \text{Recent Draws}}
       \]

6. **Count Wins, Losses, Draws from Latest Games**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/games/{year}/{month}`
   - **Data Required**:
     - Count wins, losses, draws for each format.

7. **Count Number of Games with Specified Accuracy**
   - **Endpoint**: `https://api.chess.com/pub/player/{username}/games/{year}/{month}`
   - **Data Required**:
     - Count games with known accuracy for each format.

8. **Count Number of Games with High Accuracy**
   - **Logic**: 
     - High accuracy is defined as 80%+ for ratings <1500, and 90%+ for ratings ≥1500.
   - **Data Required**:
     - Count high accuracy games for each format.

9. **Calculate Percentage of High Accuracy Games**
   - **Formula**:
     \[
     \text{High Accuracy %} = \frac{\text{High Accuracy Games}}{\text{Total Games with Known Accuracy}} \times 100
     \]
   - Calculate separately for each format.

## Additional Notes
- Ensure all calculations handle potential null values gracefully.
- Consider caching results to minimize API calls for frequently queried usernames.
