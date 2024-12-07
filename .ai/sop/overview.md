# Overview of Chess.com Risk Score Chrome Extension

## Project Goal
Develop a Chrome Extension that evaluates a chess player's risk score based on their profile and game data from Chess.com's public API. This tool will help identify potential cheaters, allowing users to make informed decisions about whether to continue or abort a game.

## High-Level Structure and Plan

1. **Research and Planning**
   - Understand the Chess.com API endpoints and data available.
   - Define the criteria and heuristics for calculating the risk score.
   - Determine the user interface and user experience for the Chrome Extension.

2. **Data Collection**
   - Access the player's profile to check their join date.
   - Retrieve player statistics to analyze win/loss/draw ratios.
   - Gather recent game data to evaluate move timing and game accuracy.

3. **Risk Score Calculation**
   - Develop a model to calculate the risk score based on:
     - Join date (recent joiners with high ratings are suspicious).
     - Win/all ratio (over 55% is concerning, weighted by the number of games).
     - Recent game performance (consistency in move timing and accuracy).

4. **Chrome Extension Development**
   - Design the extension's user interface to display the risk score.
   - Implement the logic to fetch data from the Chess.com API.
   - Integrate the risk score calculation model.

5. **Testing and Iteration**
   - Test the extension with various player profiles to ensure accuracy.
   - Gather feedback and make necessary adjustments to the heuristics and UI.

6. **Deployment and Maintenance**
   - Publish the extension on the Chrome Web Store.
   - Plan for regular updates and maintenance based on user feedback and changes in Chess.com's API.

## Additional Features
- Editable coefficients (weights) in the extension settings, with default settings for different rating ranges.
- UI design using styles from the Chess.com website.
- Menu with sections for main risk score, settings, history, and abort count.

## Testing Strategy
- Use multiple accounts and proxies for testing.
- Emulate different situations for comprehensive testing.
- Separate testing for code bugs, UX in the browser, and risk score adequacy.
