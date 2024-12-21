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

        // Extract logged-in username from #notifications-request
        const notifRequest = document.getElementById('notifications-request');
        this.loggedInUsername = notifRequest ? notifRequest.getAttribute('username') : null;
        console.debug('[GameMonitor] Logged in user:', this.loggedInUsername);

        // Add URL change listener
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

    // New helper to get username from player slot
    getBottomUsername() {
        const bottomPlayer = document.querySelector('.player-component.player-bottom');
        if (!bottomPlayer) return null;
        const usernameElement = bottomPlayer.querySelector('.user-username-component.user-tagline-username');
        return usernameElement ? usernameElement.textContent.trim() : null;
    }

    getTopUsername() {
        const topPlayer = document.querySelector('.player-component.player-top');
        if (!topPlayer) return null;
        const usernameElement = topPlayer.querySelector('.user-username-component.user-tagline-username');
        return usernameElement ? usernameElement.textContent.trim() : null;
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

    async detectCurrentPlayerAndOpponent() {
        // After stabilization, bottom should be current user, top is opponent
        const bottomUsername = this.getBottomUsername();
        const topUsername = this.getTopUsername();

        console.debug('[GameMonitor] Detected bottom username:', bottomUsername, 'top username:', topUsername);

        // Current player must be the logged-in user
        if (bottomUsername === this.loggedInUsername) {
            this.currentState.currentPlayer = bottomUsername;
            console.debug('[GameMonitor] Current player (bottom) confirmed:', bottomUsername);

            // Wait a bit to ensure opponent is stable
            await new Promise(r => setTimeout(r, 500));

            // Now detect opponent
            let attempts = 5;
            while (attempts > 0 && (!this.currentState.opponentUsername)) {
                const currentTop = this.getTopUsername();
                if (this.isValidUsername(currentTop) && currentTop !== this.currentState.currentPlayer) {
                    this.currentState.opponentUsername = currentTop;
                    console.debug('[GameMonitor] Opponent detected:', currentTop);
                } else {
                    console.debug('[GameMonitor] Opponent not ready or invalid, retrying...');
                    await new Promise(r => setTimeout(r, 500));
                }
                attempts--;
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
     * This method is no longer needed as we now detect both at once
     * but let's keep it to conform with the original structure.
     * We'll just make it do nothing or minimal work.
     */
    async detectCurrentPlayer() {
        if (this.currentState.currentPlayer) {
            console.debug('[GameMonitor] Current player already detected:', this.currentState.currentPlayer);
            return;
        }
        // The actual detection is now done in detectCurrentPlayerAndOpponent()
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

        const abortedModal = document.querySelector('.board-modal-container-container');
        if (!abortedModal) return false;

        const headerTitle = abortedModal.querySelector('.header-title-component');
        return headerTitle?.textContent.trim() === 'Game Aborted';
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
    }

    getGameIdFromUrl() {
        const baseUrl = window.location.href.split('?')[0];
        const match = baseUrl.match(/^https:\/\/www\.chess\.com\/game\/live\/(\d+)/);
        return match ? match[1] : null;
    }

    setupUrlChangeListener() {
        let lastUrl = this.currentUrl;
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                console.debug('URL changed from', lastUrl, 'to', window.location.href);
                lastUrl = window.location.href;
                
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

        urlObserver.observe(document, {
            subtree: true,
            childList: true
        });
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
            }
        }

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

    setupNavigationListener() {
        window.addEventListener('popstate', () => this.handleUrlChange());
        
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== this.currentUrl) {
                this.handleUrlChange();
            }
        });

        urlObserver.observe(document, {
            subtree: true,
            childList: true
        });

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
