import StorageService from '../services/StorageService.js';

/**
 * Monitors Chess.com game page for relevant changes
 */
class GameMonitor {
    constructor() {
        this.observer = null;
        this.currentState = {
            currentPlayer: null,
            opponentUsername: null,
            moveList: [],
            isGameAborted: false,
            lastCheck: 0,
            gameId: null
        };
        
        this.debounceInterval = 2000;
        
        // Track current tab URL
        this.currentUrl = window.location.href;

        // Add URL change listener (retained as is, even if partially redundant)
        this.setupUrlChangeListener();
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }

        // Listen for navigation events
        this.setupNavigationListener();
    }

    // New helper method to wait for both players to be visible with usernames
    async waitForGameReady(maxWaitMs = 5000, checkInterval = 500) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            const bottomPlayerName = document.querySelector('.player-component.player-bottom .user-username-component.user-tagline-username');
            const topPlayerName = document.querySelector('.player-component.player-top .user-username-component.user-tagline-username');
            if (bottomPlayerName && bottomPlayerName.textContent.trim() &&
                topPlayerName && topPlayerName.textContent.trim()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        console.warn('[GameMonitor] Page did not stabilize in time');
        return false;
    }

    async initialize() {
        // Check if we're on a game page first
        const gameId = await StorageService.extractGameId(window.location.href);
        if (!gameId) {
            console.debug('[GameMonitor] Not a game page, skipping initialization');
            return;
        }

        console.debug('[GameMonitor] Initializing for game:', gameId);
        
        // Reset state and notify background on both new game and refresh
        this.currentState = {
            gameId: gameId,
            currentPlayer: null,
            opponentUsername: null,
            moveList: [],
            isGameAborted: false
        };
        
        // Notify background to show loading state
        await this.notifyStateChange('new_game', { gameId: gameId });
        
        // Wait for DOM stabilization before detecting current player
        await this.waitForGameReady();

        // Try to detect current player immediately
        await this.detectCurrentPlayer();
        
        // Only set up observer if we're on a game page
        this.setupObserver();
    }

    /**
     * Detect current player's username
     */
    async detectCurrentPlayer() {
        if (this.currentState.currentPlayer) {
            console.debug('[GameMonitor] Current player already detected:', this.currentState.currentPlayer);
            return;
        }

        const maxAttempts = 5;
        let attempts = 0;

        while (attempts < maxAttempts && !this.currentState.currentPlayer) {
            console.debug('[GameMonitor] Attempting to detect current player (attempt', attempts + 1, ')');
            
            // Look for bottom player (current user)
            const bottomPlayer = document.querySelector('.player-component.player-bottom');
            if (bottomPlayer) {
                const usernameElement = bottomPlayer.querySelector('.user-username-component.user-tagline-username');
                if (usernameElement) {
                    const username = usernameElement.textContent.trim();
                    if (username) {
                        this.currentState.currentPlayer = username;
                        console.debug('[GameMonitor] Current player detected:', username);
                        return;
                    }
                }
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.warn('[GameMonitor] Failed to detect current player after', attempts, 'attempts');
    }

    /**
     * Set up mutation observer
     */
    setupObserver() {
        this.observer = new MutationObserver(() => {
            this.checkForGameChanges();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        this.checkForGameChanges();
    }

    /**
     * Check if enough time has passed since last check
     */
    shouldCheck() {
        const now = Date.now();
        if (now - this.currentState.lastCheck < this.debounceInterval) {
            return false;
        }
        this.currentState.lastCheck = now;
        return true;
    }

    /**
     * Check for game state changes
     */
    async checkForGameChanges() {
        // Debounce checks
        if (!this.shouldCheck()) return;

        // Extract game ID
        const gameId = await StorageService.extractGameId(window.location.href);
        if (!gameId) return;

        // If this is a new game, reset state
        if (gameId !== this.currentState.gameId) {
            console.debug('[GameMonitor] New game detected:', gameId);
            this.currentState.gameId = gameId;
            this.currentState.opponentUsername = null;
            // Wait a bit for the page to load completely on new games
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Ensure we have current player
        if (!this.currentState.currentPlayer) {
            await this.detectCurrentPlayer();
        }

        // Detect opponent if needed
        if (!this.currentState.opponentUsername) {
            const opponent = this.detectOpponent();
            if (opponent) {
                console.debug('[GameMonitor] Opponent detected:', opponent);
                this.currentState.opponentUsername = opponent;
                await this.notifyStateChange('opponent_detected', { username: opponent });
            }
        }

        // Check other states
        const moves = this.detectMoves();
        const aborted = this.detectGameAborted();

        if (moves) {
            this.currentState.moveList = moves;
            await this.notifyStateChange('moves_updated', { moves });
        }

        if (aborted) {
            this.currentState.isGameAborted = true;
            await this.notifyStateChange('game_aborted');
        }
    }

    /**
     * Detect opponent's username
     */
    detectOpponent() {
        if (!this.currentState.currentPlayer) {
            console.debug('[GameMonitor] Cannot detect opponent without current player');
            return null;
        }

        // Look for top player (opponent)
        const topPlayer = document.querySelector('.player-component.player-top');
        if (!topPlayer) {
            console.debug('[GameMonitor] No top player found');
            return null;
        }

        const usernameElement = topPlayer.querySelector('.user-username-component.user-tagline-username');
        if (!usernameElement) {
            console.debug('[GameMonitor] No username element found in top player');
            return null;
        }

        const username = usernameElement.textContent.trim();

        // Validation checks
        if (!this.isValidUsername(username)) {
            console.debug('[GameMonitor] Invalid username found:', username);
            return null;
        }

        // Skip if already detected
        if (username === this.currentState.opponentUsername) {
            console.debug('[GameMonitor] Opponent already detected:', username);
            return null;
        }

        console.debug('[GameMonitor] Found opponent:', username);
        return username;
    }

    /**
     * Validate username
     * @param {string} username - Username to validate
     * @returns {boolean} Is username valid
     */
    isValidUsername(username) {
        // Skip empty or too short usernames
        if (!username || username.length < 2) return false;

        // Skip known false positives
        const invalidUsernames = ['Opponent', 'Player', 'Anonymous'];
        if (invalidUsernames.includes(username)) return false;

        // Skip if it's the current player
        if (username === this.currentState.currentPlayer) return false;

        // Basic Chess.com username validation
        // - Must be 2-20 characters
        // - Can contain letters, numbers, underscore, hyphen
        // - Must start with a letter
        const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_-]{1,19}$/;
        return usernameRegex.test(username);
    }

    /**
     * Detect moves from the move list
     * @returns {Array|null} Array of moves if changed
     */
    detectMoves() {
        const moveListRows = document.querySelectorAll('.main-line-row.move-list-row');
        const currentMoves = Array.from(moveListRows).map(row => row.textContent.trim());

        if (JSON.stringify(currentMoves) !== JSON.stringify(this.currentState.moveList)) {
            return currentMoves;
        }
        return null;
    }

    /**
     * Detect if game was aborted
     * @returns {boolean} True if game was aborted
     */
    detectGameAborted() {
        if (this.currentState.isGameAborted) return false;

        const abortedModal = document.querySelector('.board-modal-container-container');
        if (!abortedModal) return false;

        const headerTitle = abortedModal.querySelector('.header-title-component');
        return headerTitle?.textContent.trim() === 'Game Aborted';
    }

    /**
     * Notify background script of state changes
     */
    async notifyStateChange(type, data = {}) {
        try {
            await chrome.runtime.sendMessage({
                action: 'gameStateChanged',
                updateType: type,
                data: {
                    ...data,
                    gameId: this.currentState.gameId,
                    currentPlayer: this.currentState.currentPlayer,
                    timestamp: Date.now(),
                    url: window.location.href
                }
            });
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                this.cleanup();
            } else {
                console.debug('Error notifying state change:', error);
            }
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    /**
     * Extract game ID from URL
     * @returns {string|null} Game ID or null if not a game page
     */
    getGameIdFromUrl() {
        // Remove URL parameters before matching
        const baseUrl = window.location.href.split('?')[0];
        // Only match exact /game/live/ URLs, not /analysis/game/live/
        const match = baseUrl.match(/^https:\/\/www\.chess\.com\/game\/live\/(\d+)/);
        return match ? match[1] : null;
    }

    /**
     * Setup URL change detection
     */
    setupUrlChangeListener() {
        // Listen for URL changes
        let lastUrl = this.currentUrl;
        
        // Create observer for URL changes
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                console.debug('URL changed from', lastUrl, 'to', window.location.href);
                lastUrl = window.location.href;
                
                // If we're leaving a game page, notify background
                const currentGameId = this.getGameIdFromUrl();
                if (this.currentState.gameId && !currentGameId) {
                    this.notifyStateChange('game_left');
                    this.currentState = {
                        gameId: null,
                        currentPlayer: null,
                        opponentUsername: null,
                        moveList: [],
                        isGameAborted: false
                    };
                }
            }
        });

        // Start observing URL changes
        urlObserver.observe(document, {
            subtree: true,
            childList: true
        });
    }

    setupNavigationListener() {
        // Listen for History API changes
        window.addEventListener('popstate', () => this.handleUrlChange());
        
        // Create observer for URL changes (for non-History API changes)
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== this.currentUrl) {
                this.handleUrlChange();
            }
        });

        // Observe document changes
        urlObserver.observe(document, {
            subtree: true,
            childList: true
        });

        // Intercept pushState and replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function() {
            originalPushState.apply(this, arguments);
            this.handleUrlChange();
        }.bind(this);

        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            this.handleUrlChange();
        }.bind(this);
    }

    async handleUrlChange() {
        const newUrl = window.location.href;
        console.debug('[GameMonitor] URL changed to:', newUrl);
        this.currentUrl = newUrl;

        // Check if we're entering or leaving a game page
        // Instead of getGameIdFromUrl, we rely on StorageService
        const currentGameId = await StorageService.extractGameId(window.location.href);
        
        if (currentGameId) {
            // Entering a new game page OR game ID changed
            if (currentGameId !== this.currentState.gameId) {
                console.debug('[GameMonitor] New game detected:', currentGameId);
                
                // Reset state for new game
                this.currentState = {
                    gameId: currentGameId,
                    currentPlayer: null,
                    opponentUsername: null,
                    moveList: [],
                    isGameAborted: false
                };
                
                // Notify background to show loading state
                await this.notifyStateChange('new_game', { gameId: currentGameId });
                
                // Wait briefly for the page to settle before initializing
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Initialize will trigger detection and other checks
                await this.initialize();
            }
        } else if (this.currentState.gameId) {
            // Leaving a game page
            console.debug('[GameMonitor] Leaving game page');
            await this.notifyStateChange('game_left');
            this.currentState = {
                gameId: null,
                currentPlayer: null,
                opponentUsername: null,
                moveList: [],
                isGameAborted: false
            };
        }
    }

    /**
     * Initialize monitoring
     */
    async init() {
        try {
            // Get current game ID from URL
            const gameId = this.getGameIdFromUrl();
            if (!gameId) return;

            console.debug('[GameMonitor] Initializing for game:', gameId);
            this.currentState.gameId = gameId;

            // Wait for DOM stability before detection
            await this.waitForGameReady();

            // Try to detect current player immediately
            await this.detectCurrentPlayer();
            
            // Only set up observer if we're on a game page
            this.setupObserver();
        } catch (error) {
            console.debug('Error initializing game monitor:', error);
        }
    }

    // ... rest of the class remains the same ...
}

export default GameMonitor;
