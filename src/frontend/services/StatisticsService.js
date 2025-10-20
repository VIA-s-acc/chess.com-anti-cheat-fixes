/**
 * StatisticsService
 *
 * Manages personal statistics and analytics for the user.
 * Tracks encounters with suspicious players, abort effectiveness, and trends.
 *
 * @version 2.0.0
 */

const STORAGE_KEY = 'chessRiskScore_statistics';
const ENCOUNTERS_KEY = 'chessRiskScore_encounters';

class StatisticsService {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheTTL = 30 * 1000; // 30 seconds
    }

    /**
     * Get all statistics
     * @param {string} timeFilter - Time filter: '24h', '7d', '30d', or 'all'
     */
    async getStatistics(timeFilter = 'all') {
        // Check cache (only for 'all' filter)
        if (timeFilter === 'all' && this.cache && this.cacheTimestamp &&
            (Date.now() - this.cacheTimestamp < this.cacheTTL)) {
            return this.cache;
        }

        try {
            const result = await chrome.storage.local.get([STORAGE_KEY, ENCOUNTERS_KEY]);
            const stats = result[STORAGE_KEY] || this.getDefaultStatistics();
            let encounters = result[ENCOUNTERS_KEY] || [];

            // Filter encounters by time if needed
            if (timeFilter !== 'all') {
                encounters = this.filterEncountersByTime(encounters, timeFilter);
            }

            // Calculate derived statistics
            const calculated = await this.calculateStatistics(stats, encounters, timeFilter);

            // Update cache only for 'all'
            if (timeFilter === 'all') {
                this.cache = calculated;
                this.cacheTimestamp = Date.now();
            }

            return calculated;
        } catch (error) {
            console.error('[Statistics] Failed to get statistics:', error);
            return this.getDefaultStatistics();
        }
    }

    /**
     * Filter encounters by time period
     */
    filterEncountersByTime(encounters, timeFilter) {
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;
        let cutoffTime;

        switch (timeFilter) {
            case '24h':
                cutoffTime = now - msPerDay;
                break;
            case '7d':
                cutoffTime = now - (7 * msPerDay);
                break;
            case '30d':
                cutoffTime = now - (30 * msPerDay);
                break;
            default:
                return encounters;
        }

        return encounters.filter(e => {
            const encounterTime = new Date(e.timestamp).getTime();
            return encounterTime >= cutoffTime;
        });
    }

    /**
     * Get default statistics structure
     */
    getDefaultStatistics() {
        return {
            totalGamesAnalyzed: 0,
            suspiciousPlayersEncountered: 0,
            highRiskEncounters: 0,
            criticalRiskEncounters: 0,

            abortsExecuted: 0,
            gamesPlayedAgainstSuspicious: 0,
            winsAgainstSuspicious: 0,
            lossesAgainstSuspicious: 0,

            reportsSubmitted: 0,
            reportedPlayersBanned: 0,

            firstGameDate: null,
            lastGameDate: null,

            // Time-based stats
            encountersByDay: {},
            encountersByWeek: {},
            encountersByMonth: {},

            // Risk distribution
            riskScoreDistribution: {
                low: 0,      // 0-30
                medium: 0,   // 30-60
                high: 0,     // 60-85
                critical: 0  // 85+
            },

            // Format breakdown
            formatStats: {
                bullet: { total: 0, suspicious: 0 },
                blitz: { total: 0, suspicious: 0 },
                rapid: { total: 0, suspicious: 0 }
            },

            // Top suspicious players encountered
            topSuspiciousPlayers: []
        };
    }

    /**
     * Calculate statistics from raw data
     * @param {object} baseStats - Base statistics from storage
     * @param {array} encounters - Filtered encounters
     * @param {string} timeFilter - Time filter applied
     */
    async calculateStatistics(baseStats, encounters, timeFilter = 'all') {
        const stats = { ...baseStats };

        // If filtered, recalculate stats from encounters
        if (timeFilter !== 'all') {
            // Recalculate from filtered encounters
            stats.totalGamesAnalyzed = encounters.length;
            stats.suspiciousPlayersEncountered = encounters.filter(e => e.riskScore >= 60).length;
            stats.highRiskEncounters = encounters.filter(e => e.riskScore >= 70).length;
            stats.criticalRiskEncounters = encounters.filter(e => e.riskScore >= 85).length;

            // Recalculate risk distribution
            stats.riskScoreDistribution = {
                low: encounters.filter(e => e.riskScore < 30).length,
                medium: encounters.filter(e => e.riskScore >= 30 && e.riskScore < 60).length,
                high: encounters.filter(e => e.riskScore >= 60 && e.riskScore < 85).length,
                critical: encounters.filter(e => e.riskScore >= 85).length
            };

            // Recalculate format stats
            stats.formatStats = {
                bullet: { total: 0, suspicious: 0 },
                blitz: { total: 0, suspicious: 0 },
                rapid: { total: 0, suspicious: 0 }
            };
            encounters.forEach(e => {
                const format = e.format || 'blitz';
                if (stats.formatStats[format]) {
                    stats.formatStats[format].total++;
                    if (e.riskScore >= 60) {
                        stats.formatStats[format].suspicious++;
                    }
                }
            });
        }

        // Sort encounters by date
        encounters.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Calculate time-based distribution
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const weekMs = 7 * dayMs;
        const monthMs = 30 * dayMs;

        const encountersLast24h = encounters.filter(e => now - new Date(e.timestamp).getTime() < dayMs).length;
        const encountersLast7d = encounters.filter(e => now - new Date(e.timestamp).getTime() < weekMs).length;
        const encountersLast30d = encounters.filter(e => now - new Date(e.timestamp).getTime() < monthMs).length;

        stats.encountersLast24h = encountersLast24h;
        stats.encountersLast7d = encountersLast7d;
        stats.encountersLast30d = encountersLast30d;

        // Calculate abort effectiveness
        if (stats.abortsExecuted > 0) {
            stats.abortEffectiveness = Math.round(
                (stats.abortsExecuted / (stats.abortsExecuted + stats.lossesAgainstSuspicious)) * 100
            );
        } else {
            stats.abortEffectiveness = 0;
        }

        // Calculate win rate against suspicious
        const totalGamesAgainstSuspicious = stats.gamesPlayedAgainstSuspicious;
        if (totalGamesAgainstSuspicious > 0) {
            stats.winRateVsSuspicious = Math.round(
                (stats.winsAgainstSuspicious / totalGamesAgainstSuspicious) * 100
            );
        } else {
            stats.winRateVsSuspicious = 0;
        }

        // Calculate suspicious encounters from filtered data
        stats.suspiciousEncounters = encounters.filter(e => e.riskScore >= 60).length;

        // Calculate suspicious player percentage
        if (stats.totalGamesAnalyzed > 0) {
            stats.suspiciousPercentage = Math.round(
                (stats.suspiciousEncounters / stats.totalGamesAnalyzed) * 100
            );
        } else {
            stats.suspiciousPercentage = 0;
        }

        // Format breakdown for display
        stats.formatBreakdown = {
            bullet: stats.formatStats.bullet,
            blitz: stats.formatStats.blitz,
            rapid: stats.formatStats.rapid
        };

        // Risk distribution for display
        stats.riskDistribution = stats.riskScoreDistribution;

        // Top suspicious players
        const playerCounts = {};
        encounters.forEach(e => {
            if (e.riskScore >= 60) { // Only count suspicious
                playerCounts[e.username] = playerCounts[e.username] || {
                    username: e.username,
                    encounterCount: 0,
                    highestRiskScore: 0,
                    averageRiskScore: 0,
                    totalRisk: 0,
                    lastEncounter: e.timestamp
                };

                playerCounts[e.username].encounterCount++;
                playerCounts[e.username].totalRisk += e.riskScore;
                playerCounts[e.username].highestRiskScore = Math.max(
                    playerCounts[e.username].highestRiskScore,
                    e.riskScore
                );
            }
        });

        // Calculate average risk scores
        Object.values(playerCounts).forEach(player => {
            player.averageRiskScore = Math.round(player.totalRisk / player.encounterCount);
        });

        stats.topSuspiciousPlayers = Object.values(playerCounts)
            .sort((a, b) => b.encounterCount - a.encounterCount)
            .slice(0, 10);

        return stats;
    }

    /**
     * Record a game analysis
     */
    async recordGame(gameData) {
        try {
            const { STORAGE_KEY: statsKey, ENCOUNTERS_KEY: encountersKey } = this;
            const result = await chrome.storage.local.get([statsKey, encountersKey]);

            let stats = result[statsKey] || this.getDefaultStatistics();
            let encounters = result[encountersKey] || [];

            // Update basic stats
            stats.totalGamesAnalyzed++;

            // Update dates
            const now = new Date().toISOString();
            if (!stats.firstGameDate) {
                stats.firstGameDate = now;
            }
            stats.lastGameDate = now;

            // Update risk distribution
            const riskScore = gameData.riskScore;
            if (riskScore < 30) {
                stats.riskScoreDistribution.low++;
            } else if (riskScore < 60) {
                stats.riskScoreDistribution.medium++;
            } else if (riskScore < 85) {
                stats.riskScoreDistribution.high++;
            } else {
                stats.riskScoreDistribution.critical++;
            }

            // Update suspicious encounters
            if (riskScore >= 60) {
                stats.suspiciousPlayersEncountered++;
            }
            if (riskScore >= 70) {
                stats.highRiskEncounters++;
            }
            if (riskScore >= 85) {
                stats.criticalRiskEncounters++;
            }

            // Update format stats
            const format = gameData.format || 'blitz';
            if (stats.formatStats[format]) {
                stats.formatStats[format].total++;
                if (riskScore >= 60) {
                    stats.formatStats[format].suspicious++;
                }
            }

            // Add to encounters
            encounters.unshift({
                username: gameData.username,
                riskScore: gameData.riskScore,
                format: gameData.format,
                timestamp: now,
                gameId: gameData.gameId
            });

            // Keep only last 1000 encounters
            if (encounters.length > 1000) {
                encounters = encounters.slice(0, 1000);
            }

            // Save to storage
            await chrome.storage.local.set({
                [statsKey]: stats,
                [encountersKey]: encounters
            });

            // Clear cache
            this.cache = null;
            this.cacheTimestamp = null;

            console.log('[Statistics] Game recorded:', gameData.username, riskScore);
            return { success: true };
        } catch (error) {
            console.error('[Statistics] Failed to record game:', error);
            throw error;
        }
    }

    /**
     * Record an abort
     */
    async recordAbort(abortData) {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const stats = result[STORAGE_KEY] || this.getDefaultStatistics();

            stats.abortsExecuted++;

            await chrome.storage.local.set({ [STORAGE_KEY]: stats });

            // Clear cache
            this.cache = null;
            this.cacheTimestamp = null;

            console.log('[Statistics] Abort recorded');
            return { success: true };
        } catch (error) {
            console.error('[Statistics] Failed to record abort:', error);
            throw error;
        }
    }

    /**
     * Record a game result against suspicious player
     */
    async recordGameResult(result) {
        try {
            const storageResult = await chrome.storage.local.get(STORAGE_KEY);
            const stats = storageResult[STORAGE_KEY] || this.getDefaultStatistics();

            stats.gamesPlayedAgainstSuspicious++;

            if (result === 'win') {
                stats.winsAgainstSuspicious++;
            } else if (result === 'loss') {
                stats.lossesAgainstSuspicious++;
            }

            await chrome.storage.local.set({ [STORAGE_KEY]: stats });

            // Clear cache
            this.cache = null;
            this.cacheTimestamp = null;

            console.log('[Statistics] Game result recorded:', result);
            return { success: true };
        } catch (error) {
            console.error('[Statistics] Failed to record game result:', error);
            throw error;
        }
    }

    /**
     * Record a report submission
     */
    async recordReport(reportData) {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const stats = result[STORAGE_KEY] || this.getDefaultStatistics();

            stats.reportsSubmitted++;

            if (reportData.isBanned) {
                stats.reportedPlayersBanned++;
            }

            await chrome.storage.local.set({ [STORAGE_KEY]: stats });

            // Clear cache
            this.cache = null;
            this.cacheTimestamp = null;

            console.log('[Statistics] Report recorded');
            return { success: true };
        } catch (error) {
            console.error('[Statistics] Failed to record report:', error);
            throw error;
        }
    }

    /**
     * Get encounters for a specific player
     */
    async getPlayerEncounters(username) {
        try {
            const result = await chrome.storage.local.get(ENCOUNTERS_KEY);
            const encounters = result[ENCOUNTERS_KEY] || [];

            return encounters.filter(e =>
                e.username.toLowerCase() === username.toLowerCase()
            );
        } catch (error) {
            console.error('[Statistics] Failed to get player encounters:', error);
            return [];
        }
    }

    /**
     * Get recent encounters
     */
    async getRecentEncounters(limit = 10) {
        try {
            const result = await chrome.storage.local.get(ENCOUNTERS_KEY);
            const encounters = result[ENCOUNTERS_KEY] || [];

            return encounters.slice(0, limit);
        } catch (error) {
            console.error('[Statistics] Failed to get recent encounters:', error);
            return [];
        }
    }

    /**
     * Export statistics as JSON
     */
    async exportStatistics() {
        try {
            const stats = await this.getStatistics();
            const result = await chrome.storage.local.get(ENCOUNTERS_KEY);
            const encounters = result[ENCOUNTERS_KEY] || [];

            return {
                statistics: stats,
                encounters: encounters,
                exportedAt: new Date().toISOString(),
                version: '2.0.0'
            };
        } catch (error) {
            console.error('[Statistics] Failed to export statistics:', error);
            throw error;
        }
    }

    /**
     * Reset statistics
     */
    async resetStatistics() {
        try {
            await chrome.storage.local.remove([STORAGE_KEY, ENCOUNTERS_KEY]);

            // Clear cache
            this.cache = null;
            this.cacheTimestamp = null;

            console.log('[Statistics] Statistics reset');
            return { success: true };
        } catch (error) {
            console.error('[Statistics] Failed to reset statistics:', error);
            throw error;
        }
    }
}

export default new StatisticsService();
