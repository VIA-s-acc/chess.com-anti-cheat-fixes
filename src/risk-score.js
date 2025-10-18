import { THRESHOLDS, WEIGHTS, ACCURACY_THRESHOLDS, WINRATE_THRESHOLDS, HIGH_ACCURACY_THRESHOLDS } from './config.js';
import { calculatePlayerMetrics } from './metrics.js';
import { gatherPlayerData } from './utils.js';

// Cache for weight calculations
const weightCache = new Map();

/**
 * Calculate weighted score based on sample size with caching
 * @param {number} n - Number of samples
 * @returns {number} Weight between 0 and 1
 */
function calculateWeight(n) {
    const cacheKey = n;
    if (weightCache.has(cacheKey)) {
        return weightCache.get(cacheKey);
    }
    const weight = n / (n + THRESHOLDS.WEIGHTING_K);
    weightCache.set(cacheKey, weight);
    return weight;
}

/**
 * Calculate account age score
 * @param {number} accountAgeDays - Account age in days
 * @returns {number} Score (0 or 1)
 */
function calculateAccountAgeScore(accountAgeDays) {
    return accountAgeDays <= THRESHOLDS.ACCOUNT_AGE_DAYS ? 1 : 0;
}

/**
 * Calculate win rate score with weighting
 * @param {number} winRate - Win rate percentage (as decimal)
 * @param {number} totalGames - Number of games
 * @returns {number} Weighted score (can exceed 100)
 */
function calculateWinRateScore(winRate, totalGames) {
    let score = 0;
    if (winRate <= WINRATE_THRESHOLDS.LOW_WINRATE_THRESHOLD) {
        return 0;
    }
    
    if (winRate > WINRATE_THRESHOLDS.HIGH_WINRATE_THRESHOLD) {  // Above 70%
        score = WINRATE_THRESHOLDS.EXTENDED_SCORE + 
                ((winRate - WINRATE_THRESHOLDS.HIGH_WINRATE_THRESHOLD) / WINRATE_THRESHOLDS.SCALE_FACTOR) * 
                WINRATE_THRESHOLDS.EXTENDED_SCORE;
    } else if (winRate > WINRATE_THRESHOLDS.MEDIUM_WINRATE_THRESHOLD) {  // 60%-70%
        score = WINRATE_THRESHOLDS.BASE_SCORE + 
                ((winRate - WINRATE_THRESHOLDS.MEDIUM_WINRATE_THRESHOLD) / 
                (WINRATE_THRESHOLDS.HIGH_WINRATE_THRESHOLD - WINRATE_THRESHOLDS.MEDIUM_WINRATE_THRESHOLD)) * 
                WINRATE_THRESHOLDS.BASE_SCORE;
    } else if (winRate > WINRATE_THRESHOLDS.LOW_WINRATE_THRESHOLD) {  // 50%-60%
        score = ((winRate - WINRATE_THRESHOLDS.LOW_WINRATE_THRESHOLD) / 
                (WINRATE_THRESHOLDS.MEDIUM_WINRATE_THRESHOLD - WINRATE_THRESHOLDS.LOW_WINRATE_THRESHOLD)) * 
                WINRATE_THRESHOLDS.BASE_SCORE;
    }
    
    return score * calculateWeight(totalGames);
}

/**
 * Calculate win rate difference score
 * @param {number} recentWinRate - Recent win rate percentage
 * @param {number} overallWinRate - Overall win rate percentage
 * @param {number} recentGames - Number of recent games
 * @param {number} totalGames - Total number of games
 * @returns {number} Weighted score 0-100
 */
function calculateWinRateDiffScore(recentWinRate, overallWinRate, recentGames, totalGames) {
    const difference = recentWinRate - overallWinRate;
    let score = 0;
    
    if (difference > 0) {
        if (difference > WINRATE_THRESHOLDS.SIGNIFICANT_DIFF) {
            score = WINRATE_THRESHOLDS.MAX_SCORE;
        } else {
            score = (difference / WINRATE_THRESHOLDS.SIGNIFICANT_DIFF) * WINRATE_THRESHOLDS.MAX_SCORE;
        }
    }

    const w1 = calculateWeight(recentGames);
    const w2 = calculateWeight(totalGames);
    const combinedWeight = (WINRATE_THRESHOLDS.COMBINED_WEIGHT_FACTOR * w1 * w2) / (w1 + w2);
    
    return Math.min(WINRATE_THRESHOLDS.MAX_SCORE, score * combinedWeight);
}

/**
 * Calculate high accuracy games score with optimized calculations
 * @param {Object} accuracyData - Accuracy metrics
 * @param {number} playerRating - Player's rating in the format
 * @returns {number} Weighted score (can exceed 100)
 */
function calculateHighAccuracyScore(accuracyData, playerRating) {
    const { 
        gamesWithAccuracy, 
        highAccuracyPercentage 
    } = accuracyData;

    if (gamesWithAccuracy === 0 || isNaN(highAccuracyPercentage)) {
        return {
            score: 0,
            debug: {
                baseScore: 0,
                sampleWeight: 0,
                reason: 'no_accuracy_data'
            }
        };
    }

    // Early exit for low percentages
    if (highAccuracyPercentage <= HIGH_ACCURACY_THRESHOLDS.MODERATE_SUSPICION_THRESHOLD) {
        return {
            score: 0,
            debug: {
                baseScore: 0,
                sampleWeight: 0,
                thresholds: {
                    moderate: `${HIGH_ACCURACY_THRESHOLDS.MODERATE_SUSPICION_THRESHOLD}-${HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD}%: 0-${HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE}`,
                    high: `${HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD}-${HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD}%: ${HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE}-${HIGH_ACCURACY_THRESHOLDS.HIGH_MAX_SCORE}`,
                    extreme: `>${HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD}%: ${HIGH_ACCURACY_THRESHOLDS.HIGH_MAX_SCORE}+`
                }
            }
        };
    }

    // Pre-calculate common values
    const sampleWeight = calculateWeight(gamesWithAccuracy);
    let baseScore;

    // Simplified score calculation with pre-computed thresholds
    if (highAccuracyPercentage > HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD) {
        baseScore = HIGH_ACCURACY_THRESHOLDS.HIGH_MAX_SCORE + 
            Math.floor((highAccuracyPercentage - HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD) / 
            HIGH_ACCURACY_THRESHOLDS.EXTREME_SCORE_STEP) * 
            HIGH_ACCURACY_THRESHOLDS.EXTREME_SCORE_INCREMENT;
    } else if (highAccuracyPercentage > HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD) {
        const progressInRange = (highAccuracyPercentage - HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD) / 
            (HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD - HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD);
        baseScore = HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE + 
            progressInRange * HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE;
    } else {
        const progressInRange = (highAccuracyPercentage - HIGH_ACCURACY_THRESHOLDS.MODERATE_SUSPICION_THRESHOLD) / 
            (HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD - HIGH_ACCURACY_THRESHOLDS.MODERATE_SUSPICION_THRESHOLD);
        baseScore = progressInRange * HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE;
    }

    return {
        score: baseScore * sampleWeight,
        debug: {
            baseScore,
            sampleWeight,
            thresholds: {
                moderate: `${HIGH_ACCURACY_THRESHOLDS.MODERATE_SUSPICION_THRESHOLD}-${HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD}%: 0-${HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE}`,
                high: `${HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD}-${HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD}%: ${HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE}-${HIGH_ACCURACY_THRESHOLDS.HIGH_MAX_SCORE}`,
                extreme: `>${HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD}%: ${HIGH_ACCURACY_THRESHOLDS.HIGH_MAX_SCORE}+`
            }
        }
    };
}

/**
 * Calculate account age factor
 * @param {number} accountAgeDays - Account age in days
 * @returns {number} Account age factor (1 or 1.5)
 */
function calculateAccountAgeFactor(accountAgeDays) {
    return accountAgeDays <= THRESHOLDS.ACCOUNT_AGE_DAYS 
        ? THRESHOLDS.ACCOUNT_AGE_MULTIPLIER 
        : 1;
}

/**
 * Calculate format risk score
 * @param {Object} formatMetrics - Metrics for a specific format
 * @param {boolean} debug - Whether to include debug information
 * @returns {Object} Risk score and debug info
 */
function calculateFormatRiskScore(formatMetrics, debug = false) {
    const {
        currentRating,
        overallWinrate,
        gamesCounts,
        recentGames,
        accuracy
    } = formatMetrics;

    // Calculate individual scores (not capped)
    const overallWinRateScore = calculateWinRateScore(
        overallWinrate / 100,
        gamesCounts.total
    );

    const recentWinRateScore = calculateWinRateScore(
        recentGames.winrate / 100,
        recentGames.total
    );

    const accuracyResult = calculateHighAccuracyScore(accuracy, currentRating);
    const highAccuracyScore = accuracyResult.score;

    // Calculate weighted sum of sub-scores
    const weightedSum = (
        WEIGHTS.OVERALL_WINRATE * overallWinRateScore +
        WEIGHTS.RECENT_WINRATE * recentWinRateScore +
        WEIGHTS.HIGH_ACCURACY * highAccuracyScore
    );

    // Always return an object with score and optional debug info
    return {
        score: weightedSum,
        debug: debug ? {
            overallWinRate: {
                raw: overallWinrate,
                score: overallWinRateScore,
                weight: WEIGHTS.OVERALL_WINRATE,
                weighted: WEIGHTS.OVERALL_WINRATE * overallWinRateScore,
                games: gamesCounts.total
            },
            recentWinRate: {
                raw: recentGames.winrate,
                score: recentWinRateScore,
                weight: WEIGHTS.RECENT_WINRATE,
                weighted: WEIGHTS.RECENT_WINRATE * recentWinRateScore,
                games: recentGames.total
            },
            accuracy: {
                raw: accuracy.highAccuracyPercentage,
                ...accuracyResult.debug,
                score: accuracyResult.score,
                weight: WEIGHTS.HIGH_ACCURACY,
                weighted: WEIGHTS.HIGH_ACCURACY * accuracyResult.score,
                gamesWithAccuracy: accuracy.gamesWithAccuracy,
                highAccuracyGames: accuracy.highAccuracyGames,
                playerRating: currentRating
            },
            weightedSum
        } : null
    };
}

/**
 * Calculate final risk score for a player
 * @param {Object} metrics - Player metrics
 * @param {boolean} debug - Whether to include debug information
 * @returns {Object} Risk scores and details
 */
export function calculateRiskScore(metrics, debug = false) {
    // Calculate account age factor first
    const accountAgeFactor = calculateAccountAgeFactor(metrics.accountAge);
    let maxScore = null;
    let maxFormat = null;
    let maxFactors = null;
    const otherFormats = [];

    // Calculate scores for each format
    const formatScores = [];
    
    // First calculate all format scores
    for (const [format, formatMetrics] of Object.entries(metrics.formats)) {
        if (formatMetrics.recentGames.total < THRESHOLDS.MIN_GAMES) continue;

        const result = calculateFormatRiskScore(formatMetrics, debug);
        const rawScore = result.score;
        const finalFormatScore = Math.min(100, accountAgeFactor * rawScore);
        
        formatScores.push({
            format,
            score: finalFormatScore,
            factors: debug ? {
                ...result.debug,
                accountAgeFactor,
                calculation: {
                    weightedSum: rawScore,
                    accountAgeFactor,
                    beforeCap: accountAgeFactor * rawScore,
                    afterCap: finalFormatScore
                }
            } : null
        });
    }

    // If no format scores, check if it's due to no rated games
    if (formatScores.length === 0) {
        return {
            maxScore: {
                value: 0,
                format: null,
                factors: null,
                reason: 'no_rated_games'
            },
            otherFormats: [],
            accountAgeScore: calculateAccountAgeFactor(metrics.accountAge),
            timestamp: new Date().toISOString()
        };
    }

    // Then find max and store others
    if (formatScores.length > 0) {
        // Sort by score descending
        formatScores.sort((a, b) => b.score - a.score);
        
        // Highest score becomes maxScore
        const highest = formatScores[0];
        maxScore = highest.score;
        maxFormat = highest.format;
        maxFactors = highest.factors;
        
        // Rest go to otherFormats
        otherFormats.push(...formatScores.slice(1));
    }

    return {
        maxScore: {
            value: maxScore || 0,
            format: maxFormat,
            factors: maxFactors
        },
        otherFormats,
        accountAgeScore: accountAgeFactor,
        timestamp: new Date().toISOString()
    };
}

/**
 * Calculate risk score from username
 * @param {string} username - Chess.com username
 * @param {boolean} debug - Whether to include debug information
 * @returns {Promise<Object>} Risk score results
 */
export async function calculateRiskScoreFromUsername(username, debug = false) {
    // First gather the player data
    const playerData = await gatherPlayerData(username);
    
    // Then calculate metrics
    const metrics = await calculatePlayerMetrics(playerData);
    
    // Finally calculate risk score
    return calculateRiskScore(metrics, debug);
} 