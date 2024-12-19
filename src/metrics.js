import { ACCURACY_THRESHOLDS, SETTINGS } from './config.js';
import SettingsManager from './frontend/options/SettingsManager.js';

/**
 * Player metrics calculation utilities
 */

/**
 * Calculate account age in days
 * @param {number} joinedTimestamp - Unix timestamp of account creation
 * @returns {number} Account age in days
 */
function calculateAccountAge(joinedTimestamp) {
    const now = Date.now();
    const joinedDate = new Date(joinedTimestamp * 1000); // Convert to milliseconds
    return Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate winrate from game record
 * @param {Object} record - Object containing win/loss/draw counts
 * @returns {number} Winrate as a percentage
 */
function calculateWinrate(record) {
    const { wins = 0, losses = 0, draws = 0 } = record;
    const total = wins + losses + draws;
    return total > 0 ? ((wins / total) * 100) : 0;
}

/**
 * Determine if accuracy is considered high based on rating
 * @param {number} accuracy - Game accuracy percentage
 * @param {number} rating - Player rating
 * @returns {boolean} Whether accuracy is considered high
 */
function isHighAccuracy(accuracy, rating) {
    if (!accuracy) return false;
    return rating < 1500 ? accuracy >= 80 : accuracy >= 90;
}

/**
 * Calculate metrics for a specific game format
 * @param {Object} stats - Stats for the game format
 * @param {Array} recentGames - Recent games in the format
 * @returns {Object} Calculated metrics
 */
async function calculateFormatMetrics(stats, recentGames) {
    // Load user settings or fall back to defaults
    let userSettings;
    try {
        const settings = await SettingsManager.loadSettings();
        userSettings = settings.SETTINGS;
    } catch (error) {
        console.debug('Using default settings:', error);
        userSettings = SETTINGS;
    }

    const formatGames = recentGames.filter(game => 
        game.timeClass === stats.timeClass && 
        (userSettings.RATED_ONLY ? game.rated === true : true)
    );
    
    // Count recent games results
    const recentStats = formatGames.reduce((acc, game) => {
        switch (game.result) {
            case 'win':
                acc.wins++;
                break;
            case 'loss':
                acc.losses++;
                break;
            case 'draw':
                acc.draws++;
                break;
        }
        return acc;
    }, { wins: 0, losses: 0, draws: 0 });

    // Calculate accuracy metrics
    const gamesWithAccuracy = formatGames.filter(game => game.accuracy != null);
    if (gamesWithAccuracy.length === 0) {
        return {
            currentRating: stats.rating || 0,
            overallWinrate: calculateWinrate({
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws
            }),
            gamesCounts: {
                total: stats.wins + stats.losses + stats.draws,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws
            },
            recentGames: {
                total: recentStats.wins + recentStats.losses + recentStats.draws,
                wins: recentStats.wins,
                losses: recentStats.losses,
                draws: recentStats.draws,
                winrate: calculateWinrate(recentStats)
            },
            accuracy: {
                gamesWithAccuracy: 0,
                highAccuracyGames: 0,
                highAccuracyPercentage: 0
            }
        };
    }

    const highAccuracyGames = gamesWithAccuracy.filter(game => {
        const threshold = game.playerRating < ACCURACY_THRESHOLDS.LOW_RATING.threshold
            ? ACCURACY_THRESHOLDS.LOW_RATING.requiredAccuracy
            : ACCURACY_THRESHOLDS.HIGH_RATING.requiredAccuracy;
        return game.accuracy >= threshold;
    });

    // Log for debugging
    console.log(`Format ${stats.timeClass} recent games:`, {
        total: recentStats.wins + recentStats.losses + recentStats.draws,
        wins: recentStats.wins,
        losses: recentStats.losses,
        draws: recentStats.draws
    });

    return {
        currentRating: stats.rating || 0,
        overallWinrate: calculateWinrate({
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws
        }),
        gamesCounts: {
            total: stats.wins + stats.losses + stats.draws,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws
        },
        recentGames: {
            total: recentStats.wins + recentStats.losses + recentStats.draws,
            wins: recentStats.wins,
            losses: recentStats.losses,
            draws: recentStats.draws,
            winrate: calculateWinrate(recentStats)
        },
        accuracy: {
            gamesWithAccuracy: gamesWithAccuracy.length,
            highAccuracyGames: highAccuracyGames.length,
            highAccuracyPercentage: gamesWithAccuracy.length > 0 
                ? (highAccuracyGames.length / gamesWithAccuracy.length) * 100 
                : 0
        }
    };
}

/**
 * Calculate all metrics for a player
 * @param {Object} playerData - Combined player data from API
 * @returns {Object} All calculated metrics
 */
export async function calculatePlayerMetrics(playerData) {
    try {
        const { profile, stats, recentGames } = playerData;

        // Calculate base metrics
        const accountAge = calculateAccountAge(profile.joined);

        // Calculate metrics for each format
        const formats = ['chess_rapid', 'chess_bullet', 'chess_blitz'];
        const formatMetrics = {};

        // Use Promise.all to handle async format calculations
        await Promise.all(formats.map(async format => {
            if (stats[format]) {
                const formatStats = {
                    timeClass: format.replace('chess_', ''),
                    rating: stats[format].rating,
                    wins: stats[format].wins,
                    losses: stats[format].losses,
                    draws: stats[format].draws
                };

                formatMetrics[format] = await calculateFormatMetrics(formatStats, recentGames);
            }
        }));

        return {
            accountAge,
            formats: formatMetrics,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error calculating player metrics:', error);
        throw new Error('Failed to calculate player metrics');
    }
}

/**
 * Validate calculated metrics
 * @param {Object} metrics - Calculated metrics
 * @returns {boolean} Whether metrics are valid
 */
export function validateMetrics(metrics) {
    try {
        // Basic validation checks
        if (!metrics.accountAge || metrics.accountAge < 0) return false;
        if (!metrics.formats || Object.keys(metrics.formats).length === 0) return false;

        // Validate each format's metrics
        for (const format in metrics.formats) {
            const formatMetrics = metrics.formats[format];
            
            // Check for required properties
            if (typeof formatMetrics.currentRating !== 'number') return false;
            if (typeof formatMetrics.overallWinrate !== 'number') return false;
            if (formatMetrics.overallWinrate < 0 || formatMetrics.overallWinrate > 100) return false;
            
            // Validate game counts
            const counts = formatMetrics.gamesCounts;
            if (counts.total !== counts.wins + counts.losses + counts.draws) return false;
            
            // Validate accuracy metrics
            const acc = formatMetrics.accuracy;
            if (acc.highAccuracyGames > acc.gamesWithAccuracy) return false;
            if (acc.highAccuracyPercentage < 0 || acc.highAccuracyPercentage > 100) return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating metrics:', error);
        return false;
    }
} 