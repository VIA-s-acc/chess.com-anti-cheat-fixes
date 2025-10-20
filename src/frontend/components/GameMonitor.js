import StorageService from '../services/StorageService.js';

/**
 * Monitors Chess.com game page for relevant changes
 */
class GameMonitor {
    constructor() {
        this.observer = null;
        this.urlObserver = null; // Track URL observer for cleanup
        this.currentState = {
            currentPlayer: null,
            opponentUsername: null,
            moveList: [],
            isGameAborted: false,
            lastCheck: 0,
            gameId: null
        };

        this.debounceInterval = 2000;
        this.isDetectingOpponent = false; // Flag to prevent race conditions

        // Track current tab URL
        this.currentUrl = window.location.href;

        // Extract logged-in username from #notifications-request
        const notifRequest = document.getElementById('notifications-request');
        this.loggedInUsername = notifRequest ? notifRequest.getAttribute('username') : null;
        console.debug('[GameMonitor] Logged in user:', this.loggedInUsername);

        // Set up unified navigation listener (combines URL and history changes)
        this.setupNavigationListener();

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    // New helper to get username from player slot
    getBottomUsername() {
        // Try multiple selectors for compatibility (updated for current Chess.com DOM)
        const selectors = [
            '.player-component.player-bottom .cc-user-username-component',
            '.player-bottom [data-test-element="user-tagline-username"]',
            '.player-component.player-bottom .user-username-component.user-tagline-username',
            '.player-bottom .user-tagline-username'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                console.log('[GameMonitor] Found bottom username with selector:', selector);
                return element.textContent.trim();
            }
        }

        console.warn('[GameMonitor] Could not find bottom username with any selector');
        console.log('[GameMonitor] Available player elements:',
            Array.from(document.querySelectorAll('[class*="player"]')).map(el => ({
                classes: el.className,
                text: el.textContent.substring(0, 50)
            }))
        );
        return null;
    }

    getTopUsername() {
        // Try multiple selectors for compatibility (updated for current Chess.com DOM)
        const selectors = [
            '.player-component.player-top .cc-user-username-component',
            '.player-top [data-test-element="user-tagline-username"]',
            '.player-component.player-top .user-username-component.user-tagline-username',
            '.player-top .user-tagline-username'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                console.log('[GameMonitor] Found top username with selector:', selector);
                return element.textContent.trim();
            }
        }

        console.warn('[GameMonitor] Could not find top username with any selector');
        return null;
    }

    // Stabilize detection: wait until bottom matches logged-in user
    async waitForCurrentPlayerStability(maxWaitMs = 5000, checkInterval = 500) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            const bottomName = this.getBottomUsername();
            if (bottomName === this.loggedInUsername) {
                // Double check after a short delay to ensure it doesn't flip
                await new Promise(r => setTimeout(r, checkInterval));
                const reCheck = this.getBottomUsername();
                if (reCheck === this.loggedInUsername) {
                    console.debug('[GameMonitor] Current player stable:', this.loggedInUsername);
                    return true;
                }
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        console.warn('[GameMonitor] Could not confirm stable current player as logged-in user.');
        return false;
    }

    // Wait for both players to have some username before proceeding
    async waitForGameReady(maxWaitMs = 5000, checkInterval = 500) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            const bottomPlayerName = this.getBottomUsername();
            const topPlayerName = this.getTopUsername();
            if (bottomPlayerName && bottomPlayerName.trim() && topPlayerName && topPlayerName.trim()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        console.warn('[GameMonitor] Page did not stabilize in time');
        return false;
    }

    async initialize() {
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
        
        // Wait for DOM stabilization before detecting players
        await this.waitForGameReady();

        // Confirm current player matches logged-in user at bottom
        const stable = await this.waitForCurrentPlayerStability();
        if (!stable) {
            // If not stable, we can still attempt detection, but might fail
            console.warn('[GameMonitor] Current player not stable, attempting anyway.');
        }

        await this.detectCurrentPlayerAndOpponent();
        
        // Only set up observer if we're on a game page
        this.setupObserver();
    }

    /**
     * Detect current player and opponent together
     */
    async detectCurrentPlayerAndOpponent() {
        // After stabilization, bottom should be current user, top is opponent
        const bottomUsername = this.getBottomUsername();
        const topUsername = this.getTopUsername();

        console.debug('[GameMonitor] Detected bottom username:', bottomUsername, 'top username:', topUsername);

        // Check if we're spectating (neither player is logged-in user)
        const isSpectating = this.loggedInUsername && 
                            bottomUsername !== this.loggedInUsername && 
                            topUsername !== this.loggedInUsername;

        if (isSpectating) {
            // In spectator mode, just use the detected usernames
            this.currentState.currentPlayer = bottomUsername;
            this.currentState.opponentUsername = topUsername;
            console.debug('[GameMonitor] Spectating game between:', bottomUsername, 'and', topUsername);
            await this.notifyStateChange('opponent_detected', { username: topUsername });
            return;
        }

        // Not spectating - ensure proper player assignment
        if (bottomUsername === this.loggedInUsername) {
            this.currentState.currentPlayer = bottomUsername;
            console.debug('[GameMonitor] Current player (bottom) confirmed:', bottomUsername);

            // Wait a bit to ensure opponent is stable
            await new Promise(r => setTimeout(r, 500));

            // Now detect opponent - prevent race conditions
            if (this.isDetectingOpponent) {
                console.debug('[GameMonitor] Opponent detection already in progress, skipping duplicate attempt');
                return;
            }

            this.isDetectingOpponent = true;
            try {
                let attempts = 5;
                while (attempts > 0 && (!this.currentState.opponentUsername)) {
                    const currentTop = this.getTopUsername();
                    if (this.isValidUsername(currentTop) && currentTop !== this.currentState.currentPlayer) {
                        this.currentState.opponentUsername = currentTop;
                        console.debug('[GameMonitor] Opponent detected:', currentTop);
                    } else {
                        console.debug('[GameMonitor] Opponent not ready or invalid, retrying...');
                        await this.notifyStateChange('opponent_pending', { partial: true });
                        await new Promise(r => setTimeout(r, 500));
                    }
                    attempts--;
                }
            } finally {
                this.isDetectingOpponent = false;
            }

            if (!this.currentState.opponentUsername) {
                console.warn('[GameMonitor] Failed to detect opponent username after retries.');
            } else {
                await this.notifyStateChange('opponent_detected', { username: this.currentState.opponentUsername });
            }

        } else {
            console.warn('[GameMonitor] Bottom player does not match logged-in user. This is unexpected. Retrying...');
            // Retry stabilization
            const stable = await this.waitForCurrentPlayerStability();
            if (stable) {
                await this.detectCurrentPlayerAndOpponent();
            } else {
                console.error('[GameMonitor] Cannot confirm current player as logged-in user after retries.');
            }
        }
    }

    /**
     * Kept for compatibility but does minimal work now
     */
    async detectCurrentPlayer() {
        if (this.currentState.currentPlayer) {
            console.debug('[GameMonitor] Current player already detected:', this.currentState.currentPlayer);
            return;
        }
        console.debug('[GameMonitor] detectCurrentPlayer called but detection is handled elsewhere.');
    }

    detectMoves() {
        const moveListRows = document.querySelectorAll('.main-line-row.move-list-row');
        const currentMoves = Array.from(moveListRows).map(row => row.textContent.trim());

        if (JSON.stringify(currentMoves) !== JSON.stringify(this.currentState.moveList)) {
            return currentMoves;
        }
        return null;
    }

    detectGameAborted() {
        if (this.currentState.isGameAborted) return false;

        // Method 1: Check modal with "Game Aborted" title
        const abortedModal = document.querySelector('.board-modal-container-container');
        if (abortedModal) {
            const headerTitle = abortedModal.querySelector('.header-title-component');
            const modalText = abortedModal.textContent || '';
            if (headerTitle?.textContent.trim() === 'Game Aborted' ||
                modalText.toLowerCase().includes('game aborted')) {
                console.log('[GameMonitor] Game aborted detected via modal title');
                return true;
            }
        }

        // Method 2: Check for abort in game over message
        const gameOverMessage = document.querySelector('.game-over-message-component');
        if (gameOverMessage) {
            const content = gameOverMessage.textContent || '';
            // Check for "aborted" in any language (English/Russian/etc)
            if (content.toLowerCase().includes('aborted') ||
                content.toLowerCase().includes('прервана')) {
                console.log('[GameMonitor] Game aborted detected via game-over-message-component');
                return true;
            }
        }

        // Method 3: Check for abort in game over modal
        const gameOverModal = document.querySelector('.game-over-modal-component');
        if (gameOverModal) {
            const content = gameOverModal.textContent || '';
            if (content.toLowerCase().includes('aborted') ||
                content.toLowerCase().includes('прервана')) {
                console.log('[GameMonitor] Game aborted detected via game-over modal');
                return true;
            }
        }

        // Method 3: Check game result indicators
        const resultIndicators = document.querySelectorAll('.game-result-component, .board-result-component, .result-message-component');
        for (const indicator of resultIndicators) {
            const text = indicator.textContent || '';
            if (text.toLowerCase().includes('aborted')) {
                console.log('[GameMonitor] Game aborted detected via result indicator');
                return true;
            }
        }

        // Method 4: Check for abort notification/message
        const notifications = document.querySelectorAll('.notification-component, .game-message-component, .board-message-component');
        for (const notification of notifications) {
            const text = notification.textContent || '';
            if (text.toLowerCase().includes('game has been aborted') ||
                text.toLowerCase().includes('game was aborted') ||
                text.toLowerCase().includes('aborted')) {
                console.log('[GameMonitor] Game aborted detected via notification');
                return true;
            }
        }

        // Method 5: Check for "aborted" anywhere in modal dialogs
        const allModals = document.querySelectorAll('[class*="modal"], [class*="dialog"]');
        for (const modal of allModals) {
            const text = modal.textContent || '';
            if (text.toLowerCase().includes('aborted')) {
                console.log('[GameMonitor] Game aborted detected via generic modal:', modal.className);
                return true;
            }
        }

        // Method 6: Check for board overlay messages
        const boardOverlays = document.querySelectorAll('.board-layout-component [class*="message"], .board-layout-component [class*="overlay"]');
        for (const overlay of boardOverlays) {
            const text = overlay.textContent || '';
            if (text.toLowerCase().includes('aborted')) {
                console.log('[GameMonitor] Game aborted detected via board overlay');
                return true;
            }
        }

        return false;
    }

    isValidUsername(username) {
        if (!username || username.length < 2) return false;

        const invalidUsernames = ['Opponent', 'Player', 'Anonymous'];
        if (invalidUsernames.includes(username)) return false;

        // If it's the current player, it's not the opponent, but let's still allow validation here.
        // We'll check equality separately.
        const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_-]{1,19}$/;
        return usernameRegex.test(username);
    }

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

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.urlObserver) {
            this.urlObserver.disconnect();
            this.urlObserver = null;
        }
    }

    getGameIdFromUrl() {
        const baseUrl = window.location.href.split('?')[0];
        const match = baseUrl.match(/^https:\/\/www\.chess\.com\/game\/live\/(\d+)/);
        return match ? match[1] : null;
    }

    setupObserver() {
        this.observer = new MutationObserver(() => {
            this.checkForGameChanges();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.checkForGameChanges();
    }

    shouldCheck() {
        const now = Date.now();
        if (now - this.currentState.lastCheck < this.debounceInterval) {
            return false;
        }
        this.currentState.lastCheck = now;
        return true;
    }

    async checkForGameChanges() {
        // Always check for abort immediately, even if debounce hasn't passed
        const abortedNow = this.detectGameAborted();
        if (abortedNow) {
            this.currentState.isGameAborted = true;
            console.log('[GameMonitor] Notifying background about game abort');
            console.log('[GameMonitor] Abort details:', {
                gameId: this.currentState.gameId,
                opponentUsername: this.currentState.opponentUsername,
                moveCount: this.currentState.moveList?.length || 0
            });
            await this.notifyStateChange('game_aborted', {
                gameId: this.currentState.gameId,
                opponentUsername: this.currentState.opponentUsername,
                moveCount: this.currentState.moveList?.length || 0
            });
            return; // Exit early after detecting abort
        }

        // Regular debounced checks for other game state changes
        if (!this.shouldCheck()) return;

        const gameId = await StorageService.extractGameId(window.location.href);
        if (!gameId) return;

        if (gameId !== this.currentState.gameId) {
            console.debug('[GameMonitor] New game detected:', gameId);
            this.currentState.gameId = gameId;
            this.currentState.opponentUsername = null;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!this.currentState.currentPlayer) {
            // If for some reason currentPlayer not set, try again
            await this.detectCurrentPlayerAndOpponent();
        }

        if (!this.currentState.opponentUsername) {
            // Try detecting opponent if missing
            console.debug('[GameMonitor] Opponent missing, attempting detection.');
            const currentTop = this.getTopUsername();
            if (this.isValidUsername(currentTop) && currentTop !== this.currentState.currentPlayer) {
                this.currentState.opponentUsername = currentTop;
                console.debug('[GameMonitor] Opponent detected:', currentTop);
                await this.notifyStateChange('opponent_detected', { username: currentTop });
            } else {
                console.debug('[GameMonitor] Opponent still not stable, will retry on next change.');
                // Optionally notify partial state so popup can show calculating...
                await this.notifyStateChange('opponent_pending', { partial: true });
            }
        }

        const moves = this.detectMoves();

        if (moves) {
            this.currentState.moveList = moves;
            await this.notifyStateChange('moves_updated', { moves });
        }
    }

    setupNavigationListener() {
        // Prevent duplicate setup
        if (this.urlObserver) {
            console.debug('[GameMonitor] Navigation listener already set up');
            return;
        }

        // Listen for browser back/forward
        window.addEventListener('popstate', () => this.handleUrlChange());

        // Monitor DOM changes that might indicate URL changes
        this.urlObserver = new MutationObserver(() => {
            if (window.location.href !== this.currentUrl) {
                this.handleUrlChange();
            }
        });

        this.urlObserver.observe(document, {
            subtree: true,
            childList: true
        });

        // Intercept pushState and replaceState to detect SPA navigation
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

        const currentGameId = await StorageService.extractGameId(window.location.href);
        
        if (currentGameId) {
            if (currentGameId !== this.currentState.gameId) {
                console.debug('[GameMonitor] New game detected:', currentGameId);
                
                this.currentState = {
                    gameId: currentGameId,
                    currentPlayer: null,
                    opponentUsername: null,
                    moveList: [],
                    isGameAborted: false
                };
                
                await this.notifyStateChange('new_game', { gameId: currentGameId });
                
                // Delay to let DOM partially stabilize
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                await this.initialize();
            }
        } else if (this.currentState.gameId) {
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

    async init() {
        try {
            const gameId = this.getGameIdFromUrl();
            if (!gameId) return;

            console.debug('[GameMonitor] Initializing for game:', gameId);
            this.currentState.gameId = gameId;

            await this.waitForGameReady();
            const stable = await this.waitForCurrentPlayerStability();
            if (stable) {
                await this.detectCurrentPlayerAndOpponent();
            }

            this.setupObserver();
        } catch (error) {
            console.debug('Error initializing game monitor:', error);
        }
    }
}

export default GameMonitor;
