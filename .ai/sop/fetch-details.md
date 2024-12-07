# Fetching Game Details SOP for Chess.com Risk Score Chrome Extension

## Objective
To extract the opponent's username, detect game moves, and identify the "Game Aborted" status from the Chess.com game page.

## Steps

1. **Detect Game Start and Extract Opponent's Username**
   - **File**: `src/content.js`
   - **Task**: Monitor URL changes to detect a new game start.
   - **HTML Element**: 
     - Opponent's username is located in:
       ```html
       <a class="user-username-component user-username-white user-username-link user-tagline-username" data-test-element="user-tagline-username">ramosilva</a>
       ```

2. **Track User Actions (Move or Abort)**
   - **File**: `src/content.js`
   - **Task**: Monitor the move list for changes.
   - **HTML Element**:
     - Move list is contained within:
       ```html
       <div class="main-line-row move-list-row light-row" data-whole-move-number="1">...</div>
       ```

3. **Identify "Game Aborted" Status**
   - **File**: `src/content.js`
   - **Task**: Detect the "Game Aborted" popup.
   - **HTML Element**:
     - "Game Aborted" status is indicated by:
       ```html
       <div class="board-modal-container-container">
         <div class="header-title-component">Game Aborted</div>
       </div>
       ```

## Additional Notes
- Ensure that all DOM queries handle potential null values gracefully to avoid runtime errors.
- Consider using MutationObserver to efficiently detect changes in the DOM for move tracking and game status updates.