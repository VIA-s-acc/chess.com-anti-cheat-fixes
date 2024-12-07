/**
 * Service for managing chrome.storage.local operations
 */
export class StorageService {
    constructor() {
        this.storageKey = 'chessRiskScore';
    }

    /**
     * Get current game state
     */
    async getState() {
        try {
            const data = await chrome.storage.local.get(this.storageKey);
            return data[this.storageKey] || this.getDefaultState();
        } catch (error) {
            console.debug('StorageService: Error getting state:', error);
            return this.getDefaultState();
        }
    }

    /**
     * Get default state
     */
    getDefaultState() {
        return {
            currentGameId: null,
            lastProcessedGameId: null,
            popupState: {
                isOpen: false,
                lastClosed: null
            },
            debug: true // Always on for now
        };
    }

    /**
     * Update game state
     */
    async setState(updates) {
        try {
            const currentState = await this.getState();
            const newState = {
                ...currentState,
                ...updates,
                timestamp: Date.now()
            };

            await chrome.storage.local.set({
                [this.storageKey]: newState
            });
        } catch (error) {
            console.debug('StorageService: Error setting state:', error);
        }
    }

    /**
     * Extract game ID from Chess.com URL
     */
    extractGameId(url) {
        try {
            const match = url.match(/\/game\/live\/(\d+)/);
            return match ? match[1] : null;
        } catch (error) {
            console.debug('StorageService: Error extracting game ID:', error);
            return null;
        }
    }

    /**
     * Check if game state should trigger popup
     */
    async shouldShowPopup(gameId) {
        try {
            const state = await this.getState();
            
            return (
                gameId && 
                gameId !== state.lastProcessedGameId && 
                !state.popupState.isOpen && 
                (!state.popupState.lastClosed || 
                 Date.now() - state.popupState.lastClosed > 5000)
            );
        } catch (error) {
            console.debug('StorageService: Error checking popup state:', error);
            return false;
        }
    }
}

// Create singleton instance
const storageService = new StorageService();
export default storageService; 