import { gatherPlayerData } from './utils.js';
import { calculatePlayerMetrics, validateMetrics } from './metrics.js';

/**
 * Format metrics for console output with debug info
 * @param {Object} metrics - Calculated metrics
 * @param {Object} rawData - Raw API data for debugging
 * @param {boolean} debug - Whether to show debug information
 * @returns {string} Formatted string
 */
function formatMetrics(metrics, rawData, debug = false) {
    const formatNumber = (num) => Number(num).toFixed(2);
    const formatDate = (timestamp) => new Date(timestamp * 1000).toISOString();
    
    let output = '\n=== Player Metrics Report ===\n\n';
    
    if (debug) {
        // Debug: API URLs and dates
        output += '=== Debug Information ===\n';
        output += `Profile URL: https://api.chess.com/pub/player/${rawData.username}\n`;
        output += `Stats URL: https://api.chess.com/pub/player/${rawData.username}/stats\n`;
        
        // Show months of games fetched
        const months = new Set(rawData.recentGames.map(game => {
            const date = new Date(game.timestamp * 1000);
            return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }));
        months.forEach(month => {
            output += `Games URL: https://api.chess.com/pub/player/${rawData.username}/games/${month}\n`;
        });
        output += '\n';

        // Show date ranges
        const timestamps = rawData.recentGames.map(g => g.timestamp);
        if (timestamps.length > 0) {
            const oldestGame = formatDate(Math.min(...timestamps));
            const newestGame = formatDate(Math.max(...timestamps));
            output += `Date Range of Games:\n`;
            output += `  Oldest: ${oldestGame}\n`;
            output += `  Newest: ${newestGame}\n`;
        }
        output += '\n';
    }

    // Regular metrics output
    output += `Account Age: ${metrics.accountAge} days\n`;
    output += `Timestamp: ${metrics.timestamp}\n\n`;

    for (const [format, data] of Object.entries(metrics.formats)) {
        output += `=== ${format.toUpperCase()} ===\n`;
        output += `Current Rating: ${data.currentRating}\n`;
        output += `Overall Winrate: ${formatNumber(data.overallWinrate)}%\n\n`;

        if (debug) {
            // Debug: Show raw games for this format
            const formatGames = rawData.recentGames
                .filter(game => game.timeClass === format.replace('chess_', ''));
            output += `Debug - Raw Games (${formatGames.length}):\n`;
            formatGames.forEach(game => {
                output += `  ${formatDate(game.timestamp)} - ${game.result.padEnd(4)} ` +
                         `[rated: ${game.rated}] [accuracy: ${game.accuracy || 'N/A'}]\n`;
            });
            output += '\n';
        }

        output += 'Total Games:\n';
        output += `  Total: ${data.gamesCounts.total}\n`;
        output += `  Wins: ${data.gamesCounts.wins}\n`;
        output += `  Losses: ${data.gamesCounts.losses}\n`;
        output += `  Draws: ${data.gamesCounts.draws}\n\n`;

        output += 'Recent Games:\n';
        output += `  Total: ${data.recentGames.total}\n`;
        output += `  Wins: ${data.recentGames.wins}\n`;
        output += `  Losses: ${data.recentGames.losses}\n`;
        output += `  Draws: ${data.recentGames.draws}\n`;
        output += `  Winrate: ${formatNumber(data.recentGames.winrate)}%\n\n`;

        output += 'Accuracy:\n';
        output += `  Games with Accuracy: ${data.accuracy.gamesWithAccuracy}\n`;
        output += `  High Accuracy Games: ${data.accuracy.highAccuracyGames}\n`;
        output += `  High Accuracy Percentage: ${formatNumber(data.accuracy.highAccuracyPercentage)}%\n\n`;
    }

    return output;
}

/**
 * Main test function
 * @param {string} username - Chess.com username to test
 * @param {boolean} debug - Whether to show debug information
 */
async function testMetrics(username, debug = false) {
    console.log(`\nFetching data for user: ${username}`);
    console.log('Please wait...\n');

    try {
        // Gather data
        const playerData = await gatherPlayerData(username);
        console.log('Data fetched successfully!');

        // Add username to raw data for debug output
        playerData.username = username;

        // Calculate metrics
        const metrics = await calculatePlayerMetrics(playerData);

        // Validate metrics
        const isValid = validateMetrics(metrics);
        if (!isValid) {
            throw new Error('Metrics validation failed');
        }

        // Display results with debug info if requested
        console.log(formatMetrics(metrics, playerData, debug));

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Get username and debug flag from command line arguments
const username = process.argv[2];
const debug = process.argv.includes('--debug');

if (!username) {
    console.error('Please provide a username as an argument');
    console.log('Usage: node test-metrics.js <username> [--debug]');
    process.exit(1);
}

// Run the test
testMetrics(username, debug); 