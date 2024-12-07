import { calculateRiskScoreFromUsername } from './risk-score.js';
import { gatherPlayerData } from './utils.js';

/**
 * Mock API responses for testing
 */
const mockResponses = {
    profile: {
        joined: Date.now() - (90 * 24 * 60 * 60 * 1000) // 90 days old account
    },
    stats: {
        chess_rapid: {
            last: { rating: 1500 },
            record: { win: 100, loss: 50, draw: 10 }
        },
        chess_blitz: {
            last: { rating: 1600 },
            record: { win: 200, loss: 100, draw: 20 }
        }
    },
    games: [
        // Add mock game data here if needed
    ]
};

/**
 * Test risk score calculation with mock data
 */
async function testWithMockData() {
    // Store original fetch
    const originalFetch = global.fetch;
    
    try {
        // Mock fetch for testing
        global.fetch = jest.fn((url) => {
            if (url.includes('/player/mockuser')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponses.profile)
                });
            }
            if (url.includes('/stats')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponses.stats)
                });
            }
            if (url.includes('/games')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ games: mockResponses.games })
                });
            }
            return Promise.reject(new Error('Not found'));
        });

        const riskScore = await calculateRiskScoreFromUsername('mockuser', true);
        console.log('Mock Test Results:', formatRiskScore(riskScore, true));
        
    } finally {
        // Restore original fetch
        global.fetch = originalFetch;
    }
}

/**
 * Format risk score results for console output
 * @param {Object} riskScore - Risk score results
 * @param {boolean} debug - Whether to include debug information
 * @returns {string} Formatted output
 */
function formatRiskScore(riskScore, debug = false) {
    const formatNumber = (num) => Number(num).toFixed(2);
    
    let output = '\n=== Risk Score Report ===\n\n';
    
    // Main score from maxScore
    output += `Final Risk Score: ${formatNumber(riskScore.maxScore.value)}/100\n`;
    output += `Format: ${riskScore.maxScore.format}\n`;
    output += `Account Age Factor: ${formatNumber(riskScore.accountAgeScore)}\n`;
    output += `Timestamp: ${riskScore.timestamp}\n\n`;
    
    // Other formats
    if (riskScore.otherFormats.length > 0) {
        output += '=== Other Formats ===\n';
        riskScore.otherFormats.forEach(format => {
            output += `${format.format}: ${formatNumber(format.score)}/100\n`;
        });
        output += '\n';
    }

    // Debug information
    if (debug && riskScore.maxScore.factors) {
        output += '=== Debug Information ===\n';
        const factors = riskScore.maxScore.factors;
        
        output += '\nScore Calculation:\n';
        if (factors.overallWinRate) {
            output += `  Overall Win Rate: ${formatNumber(factors.overallWinRate.raw)}%\n`;
            output += `    Score: ${formatNumber(factors.overallWinRate.weighted)} (weight: ${factors.overallWinRate.weight})\n`;
        }
        if (factors.recentWinRate) {
            output += `  Recent Win Rate: ${formatNumber(factors.recentWinRate.raw)}%\n`;
            output += `    Score: ${formatNumber(factors.recentWinRate.weighted)} (weight: ${factors.recentWinRate.weight})\n`;
        }
        if (factors.accuracy) {
            output += `  Accuracy: ${formatNumber(factors.accuracy.raw)}%\n`;
            output += `    Score: ${formatNumber(factors.accuracy.weighted)} (weight: ${factors.accuracy.weight})\n`;
            output += `    Games with Accuracy: ${factors.accuracy.gamesWithAccuracy}\n`;
            output += `    High Accuracy Games: ${factors.accuracy.highAccuracyGames}\n`;
        }
        
        output += `\nFinal Calculation:\n`;
        output += `  Base Score: ${factors.calculation?.weightedSum || 'N/A'}\n`;
        output += `  Account Age Factor: ${factors.calculation?.accountAgeFactor || 'N/A'}\n`;
        output += `  Final Score: ${factors.calculation?.afterCap || 'N/A'}\n`;
    }
    
    return output;
}

/**
 * Main test function with enhanced error handling
 * @param {string} username - Chess.com username to test
 * @param {boolean} debug - Whether to include debug information
 * @param {boolean} useMock - Whether to use mock data
 */
async function testRiskScore(username, debug = false, useMock = false) {
    console.log(`\nCalculating risk score for user: ${username}`);
    console.log('Please wait...\n');

    try {
        if (useMock) {
            await testWithMockData();
            return;
        }

        // First gather the raw data
        console.log('Gathering player data...');
        const playerData = await gatherPlayerData(username);
        console.log('\nRaw player data:', JSON.stringify(playerData, null, 2));

        // Then calculate risk score
        console.log('\nCalculating risk score...');
        const riskScore = await calculateRiskScoreFromUsername(username, debug);
        console.log('\nRisk score result:', JSON.stringify(riskScore, null, 2));
        
        console.log('\nFormatted output:');
        console.log(formatRiskScore(riskScore, debug));
        
    } catch (error) {
        console.error('\nError details:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0];
const debug = args.includes('--debug');
const useMock = args.includes('--mock');

if (!username && !useMock) {
    console.error('Please provide a username as an argument');
    console.log('Usage: node test-risk-score.js <username> [--debug] [--mock]');
    process.exit(1);
}

// Run the test
testRiskScore(username, debug, useMock); 