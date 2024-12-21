import { calculateRiskScoreFromUsername } from '../../src/risk-score.js';
import { SETTINGS } from '../../src/config.js';
import SettingsManager from './options/SettingsManager.js';

// Custom logging function to show logs in both console and service worker
function log(level, ...args) {
    const prefix = `[Background] `;
    switch (level) {
        case 'debug':
            console.debug(prefix, ...args);
            break;
        case 'info':
            console.info(prefix, ...args);
            break;
        case 'warn':
            console.warn(prefix, ...args);
            break;
        case 'error':
            console.error(prefix, ...args);
            break;
    }
}

// Global error handlers for service worker context
self.addEventListener('unhandledrejection', (event) => {
    log('error', 'Unhandled Promise Rejection:', event.reason);
    event.preventDefault();
});

self.addEventListener('error', (event) => {
    log('error', 'Uncaught Error:', event.error);
    event.preventDefault();
});

// Store for current game state and popup port
let currentGameState = {
    opponentUsername: null,
    moveList: [],
    isGameAborted: false,
    timestamp: null
};
let popupPort = null;
let lastRiskScore = null;  // Store last calculated score

// Listen for popup connections
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'popup') {
        log('debug', 'Popup connected');
        popupPort = port;

        // Clear badge when popup opens
        try {
            chrome.action.setBadgeText({ text: '' });
        } catch (error) {
            log('debug', 'Could not clear badge text:', error);
        }
        
        // If we have a lastRiskScore, send it
        if (lastRiskScore) {
            port.postMessage({
                action: 'updateRiskScore',
                data: lastRiskScore
            });
        } 
        // If we have an opponent but no score, calculate it
        else if (currentGameState.opponentUsername) {
            port.postMessage({ action: 'calculatingRiskScore' });
            // Trigger recalculation
            handleGameStateChange('opponent_detected', {
                username: currentGameState.opponentUsername,
                timestamp: Date.now()
            });
        }

        // Handle requests from the popup
        port.onMessage.addListener((msg) => {
            if (msg.action === 'getCurrentState') {
                log('debug', 'Popup requested current state.');
                // Use same logic as above for consistency
                if (lastRiskScore) {
                    port.postMessage({
                        action: 'updateRiskScore',
                        data: lastRiskScore
                    });
                } else if (currentGameState.opponentUsername) {
                    port.postMessage({ action: 'calculatingRiskScore' });
                    handleGameStateChange('opponent_detected', {
                        username: currentGameState.opponentUsername,
                        timestamp: Date.now()
                    });
                } else {
                    port.postMessage({ action: 'clearDisplay' });
                }
            }
        });
        
        port.onDisconnect.addListener(() => {
            log('debug', 'Popup disconnected');
            popupPort = null;
        });
    }
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    log('info', 'Chess.com Risk Score Extension installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        log('debug', 'Received message:', request);
        
        if (request.action === 'gameStateChanged') {
            handleGameStateChange(request.updateType, request.data);
            sendResponse({ success: true });
            return true;
        }

        log('warn', 'Unknown action received:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
        return true;

    } catch (error) {
        log('error', 'Error handling message:', error);
        sendResponse({ success: false, error: error.message });
        return true;
    }
});

async function handleGameStateChange(updateType, data) {
    try {
        log('debug', 'Handling game state change:', updateType, data);
        
        switch (updateType) {
            case 'new_game':
                // Clear state for new game
                currentGameState = {
                    opponentUsername: null,
                    moveList: [],
                    isGameAborted: false,
                    timestamp: Date.now()
                };
                lastRiskScore = null;
                
                // Reset popup display if connected
                if (popupPort) {
                    popupPort.postMessage({ 
                        action: 'clearDisplay'
                    });
                }
                break;

            case 'game_left':
                // Clear state when leaving game page
                currentGameState = {
                    opponentUsername: null,
                    moveList: [],
                    isGameAborted: false,
                    timestamp: null
                };
                lastRiskScore = null;
                
                // Notify popup if connected
                if (popupPort) {
                    popupPort.postMessage({ 
                        action: 'clearDisplay'
                    });
                }
                break;

            case 'opponent_detected':
                // Clear any previous state
                currentGameState = {
                    opponentUsername: data.username,
                    moveList: [],
                    isGameAborted: false,
                    timestamp: data.timestamp
                };
                if (lastRiskScore && lastRiskScore.opponentUsername !== data.username) {
                    lastRiskScore = null;
                }


                // Load user settings or fall back to defaults
                let userSettings;
                try {
                    const settings = await SettingsManager.loadSettings();
                    userSettings = settings.SETTINGS;
                } catch (error) {
                    console.debug('Using default settings:', error);
                    userSettings = SETTINGS;
                }

                // Try to open popup automatically if enabled
                if (userSettings.AUTO_OPEN_POPUP) {
                    try {
                        await chrome.action.openPopup();
                    } catch (error) {
                        log('debug', 'Could not open popup:', error);
                    }
                } else {
                    // If auto-popup is disabled, show badge text
                    try {
                        await chrome.action.setBadgeText({ text: '!' });
                        await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });  // Green color
                        log('debug', 'Badge text set to indicate score availability');
                    } catch (error) {
                        log('debug', 'Could not set badge text:', error);
                    }
                }
                
                // Notify popup that calculation is starting
                if (popupPort) {
                    popupPort.postMessage({ action: 'calculatingRiskScore' });
                }
                
                // Log game detection
                log('info', `Game ${data.gameId || 'unknown'} detected`);
                log('info', `Current user: ${data.currentPlayer || 'unknown'}, Opponent: ${data.username}`);
                
                // Log API requests
                log('info', `Starting API calls for ${data.username}...`);
                log('info', `Fetching player data from https://api.chess.com/pub/player/${data.username}`);
                log('info', `Fetching stats from https://api.chess.com/pub/player/${data.username}/stats`);
                log('info', `Fetching games from https://api.chess.com/pub/player/${data.username}/games/2024/11`);
                
                try {
                    // Calculate risk score
                    const riskScore = await calculateRiskScoreFromUsername(data.username, true);
                    lastRiskScore = {
                        ...riskScore,
                        opponentUsername: data.username
                    };  // Store the score
                    
                    // Log format comparison
                    log('info', '\nFormat Comparison:');
                    log('info', `Max Score Format: ${riskScore.maxScore.format} = ${Math.round(riskScore.maxScore.value)}%`);
                    if (riskScore.otherFormats.length > 0) {
                        riskScore.otherFormats.forEach(format => {
                            log('info', `Other Format: ${format.format} = ${Math.round(format.score)}%`);
                        });
                    } else {
                        log('info', 'No other formats available');
                    }
                    
                    // Send to popup if connected
                    if (popupPort) {
                        popupPort.postMessage({
                            action: 'updateRiskScore',
                            data: {
                                ...riskScore,
                                opponentUsername: data.username  // Add opponent username to the data
                            }
                        });
                    }
                    
                    // Log results
                    log('info', `Final risk score: ${Math.round(riskScore.maxScore.value)}% (${riskScore.maxScore.value > 66 ? 'High' : riskScore.maxScore.value > 33 ? 'Medium' : 'Low'} Risk)`);
                    
                    // Log detailed breakdown if factors exist
                    if (riskScore.maxScore.factors) {
                        const f = riskScore.maxScore.factors;
                        log('info', '\nScore Breakdown:');
                        log('info', `Overall Win Rate: ${f.overallWinRate.raw.toFixed(2)}% (Score: ${f.overallWinRate.weighted.toFixed(2)})`);
                        log('info', `Recent Win Rate: ${f.recentWinRate.raw.toFixed(2)}% (Score: ${f.recentWinRate.weighted.toFixed(2)})`);
                        log('info', `Accuracy: ${f.accuracy.raw.toFixed(2)}% (Score: ${f.accuracy.weighted.toFixed(2)})`);
                        log('info', `High Accuracy Games: ${f.accuracy.highAccuracyGames}/${f.accuracy.gamesWithAccuracy}`);
                        log('info', `\nFinal Calculation:`);
                        log('info', `Base Score: ${f.calculation.weightedSum.toFixed(2)}`);
                        log('info', `After Cap: ${f.calculation.afterCap.toFixed(2)}`);
                    }
                } catch (error) {
                    log('error', 'Error calculating risk score:', error);
                    if (popupPort) {
                        popupPort.postMessage({ 
                            action: 'error', 
                            message: 'Failed to calculate risk score' 
                        });
                    }
                }
                break;

            case 'moves_updated':
                currentGameState.moveList = data.moves;
                currentGameState.timestamp = data.timestamp;
                log('debug', 'Moves updated:', data.moves?.length || 0, 'moves');
                break;

            case 'game_aborted':
                currentGameState.isGameAborted = true;
                currentGameState.timestamp = data.timestamp;
                log('info', 'Game aborted');
                break;

            default:
                log('warn', 'Unknown update type:', updateType);
        }
    } catch (error) {
        log('error', 'Error handling game update:', error);
    }
}