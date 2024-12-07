import GameMonitor from './components/GameMonitor.js';
import StorageService from './services/StorageService.js';

class ContentScript {
    constructor() {
        this.gameMonitor = null;
        this.urlObserver = null;
        this.initialize();
    }

    async initialize() {
        try {
            this.gameMonitor = new GameMonitor();
            this.setupUrlObserver();
            this.setupReconnection();
        } catch (error) {
            console.debug('Error initializing content script:', error);
            this.cleanup();
        }
    }

    setupUrlObserver() {
        let lastUrl = window.location.href;
        this.urlObserver = new MutationObserver(async () => {
            try {
                if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    await this.handleUrlChange(lastUrl);
                }
            } catch (error) {
                if (error.message.includes('Extension context invalidated')) {
                    this.cleanup();
                    this.initialize(); // Reinitialize
                } else {
                    console.debug('Error in URL observer:', error);
                }
            }
        });

        this.urlObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupReconnection() {
        chrome.runtime.onConnect.addListener(() => {
            console.debug('Reconnected to extension');
            this.initialize();
        });
    }

    async handleUrlChange(url) {
        const gameId = await StorageService.extractGameId(url);
        if (gameId) {
            const shouldShow = await StorageService.shouldShowPopup(gameId);
            if (shouldShow) {
                await StorageService.setState({
                    currentGameId: gameId,
                    popupState: { isOpen: true }
                });
                
                await this.sendMessage({
                    action: 'showPopup',
                    gameId: gameId
                });
            }
        }
    }

    async sendMessage(message) {
        try {
            return await chrome.runtime.sendMessage(message);
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                this.cleanup();
                this.initialize(); // Reinitialize
            } else {
                console.debug('Error sending message:', error);
            }
        }
    }

    cleanup() {
        if (this.gameMonitor) {
            this.gameMonitor.cleanup();
            this.gameMonitor = null;
        }
        if (this.urlObserver) {
            this.urlObserver.disconnect();
            this.urlObserver = null;
        }
    }
}

// Start content script
const contentScript = new ContentScript();

// Handle unload
window.addEventListener('unload', () => {
    contentScript.cleanup();
}); 