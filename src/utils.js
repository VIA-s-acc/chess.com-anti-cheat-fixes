/**
 * Utility functions for interacting with Chess.com API
 */

const API_BASE_URL = 'https://api.chess.com/pub';
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds default timeout

import { GAME_RESULTS, SETTINGS } from './config.js';
import SettingsManager from './frontend/options/SettingsManager.js';

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
    }
}

/**
 * Fetch with retry and exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, DEFAULT_TIMEOUT_MS);
            
            // Only retry on server errors (5xx) or rate limits (429)
            if (response.status >= 500 || response.status === 429) {
                throw new Error(`Retryable error: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            // Only retry on network errors or retryable status codes
            if (!error.message.includes('Retryable error') && !error.message.includes('Failed to fetch')) {
                throw error;
            }
            
            if (attempt === maxRetries) break;
            
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Validate Chess.com username format
 * @param {string} username - Username to validate
 * @returns {boolean} Whether username is valid
 */
function isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username.length < 3 || username.length > 25) return false;
    // Chess.com usernames: 3-25 chars, alphanumeric, hyphens, underscores
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}[a-zA-Z0-9]$/;
    return usernameRegex.test(username);
}

/**
 * Safe JSON parsing with error handling
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>} Parsed JSON data
 */
async function safeJsonParse(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Failed to parse JSON response:', text.substring(0, 200));
        throw new Error('Invalid JSON response from API');
    }
}

/**
 * Fetches player profile information
 * @param {string} username - Chess.com username
 * @returns {Promise<Object>} Player profile data
 */
async function fetchPlayerProfile(username) {
    if (!isValidUsername(username)) {
        throw new Error(`Invalid username format: ${username}`);
    }

    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/player/${username}`);
        if (!response.ok) throw new Error('Failed to fetch player profile');
        const data = await safeJsonParse(response);
        
        if (!data || typeof data.joined !== 'number') {
            throw new Error('Invalid profile data structure');
        }
        
        return {
            joined: data.joined
        };
    } catch (error) {
        console.error('Error fetching player profile:', error);
        throw error;
    }
}

/**
 * Fetches player statistics
 * @param {string} username - Chess.com username
 * @returns {Promise<Object>} Player statistics
 */
async function fetchPlayerStats(username) {
    if (!isValidUsername(username)) {
        throw new Error(`Invalid username format: ${username}`);
    }

    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/player/${username}/stats`);
        if (!response.ok) throw new Error('Failed to fetch player stats');
        const data = await safeJsonParse(response);

        const relevantFormats = ['chess_rapid', 'chess_bullet', 'chess_blitz'];
        const stats = {};

        relevantFormats.forEach(format => {
            if (data[format]) {
                stats[format] = {
                    rating: data[format].last?.rating,
                    wins: data[format].record?.win,
                    losses: data[format].record?.loss,
                    draws: data[format].record?.draw
                };
            }
        });

        return stats;
    } catch (error) {
        console.error('Error fetching player stats:', error);
        throw error;
    }
}

/**
 * Fetches recent games for a player
 * @param {string} username - Chess.com username
 * @returns {Promise<Array>} Recent games data
 */
async function fetchRecentGames(username) {
    try {
        // Load user settings or fall back to defaults
        let userSettings;
        try {
            const settings = await SettingsManager.loadSettings();
            userSettings = settings.SETTINGS;
        } catch (error) {
            console.debug('Using default settings:', error);
            userSettings = SETTINGS;
        }

        const date = new Date();
        const currentYear = date.getFullYear();
        const currentMonth = date.getMonth() + 1;
        
        const monthsToFetch = [];
        if (date.getDate() < 15) {
            const prevDate = new Date(date.setMonth(date.getMonth() - 1));
            monthsToFetch.push({
                year: prevDate.getFullYear(),
                month: String(prevDate.getMonth() + 1).padStart(2, '0')
            });
        }
        monthsToFetch.push({ 
            year: currentYear, 
            month: String(currentMonth).padStart(2, '0') 
        });

        const gamesPromises = monthsToFetch.map(({ year, month }) =>
            fetchWithRetry(`${API_BASE_URL}/player/${username}/games/${year}/${month}`)
                .then(response => safeJsonParse(response))
                .catch((error) => {
                    console.warn(`Failed to fetch games for ${year}/${month}:`, error.message);
                    return { games: [] };
                })
        );

        const responses = await Promise.all(gamesPromises);
        
        const games = responses.flatMap(response => response.games || [])
            .filter(game => 
                game?.rules === 'chess' && 
                ['rapid', 'bullet', 'blitz'].includes(game?.time_class) &&
                (userSettings.RATED_ONLY ? game?.rated === true : true)
            )
            .map(game => {
                const playerColor = game.white.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
                const rawResult = game[playerColor].result;
                
                return {
                    timeClass: game.time_class,
                    playerColor,
                    playerRating: game[playerColor].rating,
                    result: GAME_RESULTS[rawResult] || 'unknown',
                    accuracy: game.accuracies?.[playerColor],
                    timestamp: game.end_time,
                    rated: game.rated
                };
            })
            .filter(game => game.result !== 'unknown');

        return games;
    } catch (error) {
        console.error('Error fetching recent games:', error);
        throw error;
    }
}

/**
 * Main function to gather all player data
 * @param {string} username - Chess.com username
 * @returns {Promise<Object>} Combined player data
 */
async function gatherPlayerData(username) {
    if (!isValidUsername(username)) {
        throw new Error(`Invalid username format: ${username}. Username must be 3-25 characters, alphanumeric with hyphens/underscores.`);
    }

    try {
        const [profile, stats, recentGames] = await Promise.all([
            fetchPlayerProfile(username),
            fetchPlayerStats(username),
            fetchRecentGames(username)
        ]);

        return {
            profile,
            stats,
            recentGames
        };
    } catch (error) {
        console.error('Error gathering player data:', error);
        throw error;
    }
}

export {
    fetchPlayerProfile,
    fetchPlayerStats,
    fetchRecentGames,
    gatherPlayerData
}; 