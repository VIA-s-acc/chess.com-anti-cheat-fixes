/**
 * Abort Tracker Service - Track game aborts and warn about cooldown
 * @version 1.6.0
 *
 * Chess.com abort limitations (estimated based on observations):
 * - Can abort if less than 2 moves made
 * - Limit: ~10 aborts per rolling window
 * - Cooldown: ~10-15 minutes after hitting limit
 * - During cooldown: Cannot abort = risk of playing cheaters
 */

const STORAGE_KEY = 'abort_tracker';
const ABORT_LIMIT = 10;           // Max aborts before cooldown
const ROLLING_WINDOW = 60 * 60 * 1000;  // 1 hour rolling window
const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 minutes estimated cooldown
const WARNING_THRESHOLD = 8;      // Warn when 8/10 aborts used

class AbortTrackerService {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = 0;
        this.CACHE_TTL = 2000; // 2 seconds cache
    }

    /**
     * Record a game abort
     * @param {Object} abortData
     * @param {string} abortData.gameId - Game ID
     * @param {string} abortData.opponentUsername - Opponent name (optional)
     * @param {number} abortData.moveCount - Number of moves made
     * @param {string} abortData.reason - Reason for abort (optional)
     */
    async recordAbort(abortData) {
        try {
            const tracker = await this.getTracker();

            const abort = {
                id: this.generateId(),
                timestamp: Date.now(),
                gameId: abortData.gameId || 'unknown',
                opponentUsername: abortData.opponentUsername || null,
                moveCount: abortData.moveCount || 0,
                reason: abortData.reason || 'User aborted'
            };

            tracker.aborts.unshift(abort);

            // Clean old aborts outside rolling window
            const windowStart = Date.now() - ROLLING_WINDOW;
            tracker.aborts = tracker.aborts.filter(a => a.timestamp > windowStart);

            // Update statistics
            tracker.stats.totalAborts++;
            tracker.stats.abortsInWindow = tracker.aborts.length;
            tracker.stats.lastAbortTime = Date.now();

            // Check if hit limit
            if (tracker.aborts.length >= ABORT_LIMIT) {
                tracker.cooldown = {
                    active: true,
                    startTime: Date.now(),
                    endTime: Date.now() + COOLDOWN_DURATION,
                    abortsAtLimit: tracker.aborts.length
                };
                tracker.stats.cooldownCount++;
            }

            await this.saveTracker(tracker);
            this.invalidateCache();

            return {
                success: true,
                abortCount: tracker.aborts.length,
                isInCooldown: tracker.cooldown.active,
                shouldWarn: tracker.aborts.length >= WARNING_THRESHOLD
            };

        } catch (error) {
            console.error('[AbortTracker] Error recording abort:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current abort tracker state
     */
    async getTracker() {
        // Check cache
        if (this.cache && (Date.now() - this.cacheTimestamp < this.CACHE_TTL)) {
            return this.cache;
        }

        // Load from storage
        const result = await chrome.storage.local.get(STORAGE_KEY);
        let tracker = result[STORAGE_KEY];

        if (!tracker) {
            tracker = this.createDefaultTracker();
        } else {
            // Clean old aborts
            const windowStart = Date.now() - ROLLING_WINDOW;
            tracker.aborts = tracker.aborts.filter(a => a.timestamp > windowStart);
            tracker.stats.abortsInWindow = tracker.aborts.length;

            // Check if cooldown expired
            if (tracker.cooldown.active && Date.now() > tracker.cooldown.endTime) {
                tracker.cooldown.active = false;
                tracker.cooldown.lastEndTime = tracker.cooldown.endTime;
            }
        }

        // Update cache
        this.cache = tracker;
        this.cacheTimestamp = Date.now();

        return tracker;
    }

    /**
     * Get current status for UI display
     */
    async getStatus() {
        const tracker = await this.getTracker();

        const abortsRemaining = Math.max(0, ABORT_LIMIT - tracker.aborts.length);
        const isNearLimit = tracker.aborts.length >= WARNING_THRESHOLD;
        const isAtLimit = tracker.aborts.length >= ABORT_LIMIT;

        let warningLevel = 'safe';      // 0-7 aborts
        if (isAtLimit) warningLevel = 'danger';        // 10+ aborts
        else if (isNearLimit) warningLevel = 'warning'; // 8-9 aborts

        return {
            abortsUsed: tracker.aborts.length,
            abortsRemaining,
            abortLimit: ABORT_LIMIT,
            isInCooldown: tracker.cooldown.active,
            cooldownEndsAt: tracker.cooldown.active ? tracker.cooldown.endTime : null,
            cooldownTimeRemaining: tracker.cooldown.active
                ? Math.max(0, tracker.cooldown.endTime - Date.now())
                : 0,
            warningLevel,
            shouldWarn: isNearLimit || tracker.cooldown.active,
            canAbort: !tracker.cooldown.active && tracker.aborts.length < ABORT_LIMIT,
            message: this.getStatusMessage(tracker, warningLevel),
            stats: tracker.stats
        };
    }

    /**
     * Get appropriate status message
     */
    getStatusMessage(tracker, warningLevel) {
        if (tracker.cooldown.active) {
            const remaining = Math.ceil((tracker.cooldown.endTime - Date.now()) / 60000);
            return `⛔ Abort cooldown active! Wait ${remaining} min. AVOID PLAYING NOW - can't abort cheaters!`;
        }

        const abortsLeft = ABORT_LIMIT - tracker.aborts.length;

        if (warningLevel === 'warning') {
            return `⚠️ Warning: Only ${abortsLeft} abort${abortsLeft !== 1 ? 's' : ''} remaining before cooldown!`;
        }

        if (warningLevel === 'safe') {
            return `✅ Safe: ${abortsLeft} abort${abortsLeft !== 1 ? 's' : ''} available`;
        }

        return `Aborts: ${tracker.aborts.length}/${ABORT_LIMIT}`;
    }

    /**
     * Check if should show warning before starting a new game
     */
    async shouldWarnBeforeGame() {
        const status = await this.getStatus();

        return {
            shouldWarn: status.shouldWarn,
            warningLevel: status.warningLevel,
            message: status.message,
            recommendation: this.getRecommendation(status)
        };
    }

    /**
     * Get recommendation based on current status
     */
    getRecommendation(status) {
        if (status.isInCooldown) {
            return {
                action: 'STOP_PLAYING',
                severity: 'critical',
                message: 'STOP PLAYING! You cannot abort games during cooldown. If you face a cheater, you will be forced to play or resign.',
                icon: '🛑'
            };
        }

        if (status.warningLevel === 'warning') {
            return {
                action: 'PLAY_CAREFULLY',
                severity: 'high',
                message: `Only ${status.abortsRemaining} aborts left. Consider taking a break or you risk cooldown.`,
                icon: '⚠️'
            };
        }

        return {
            action: 'SAFE_TO_PLAY',
            severity: 'low',
            message: 'Safe to play. You have enough aborts available.',
            icon: '✅'
        };
    }

    /**
     * Get abort history for display
     */
    async getAbortHistory(limit = 20) {
        const tracker = await this.getTracker();
        return tracker.aborts.slice(0, limit);
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        const tracker = await this.getTracker();
        const status = await this.getStatus();

        return {
            ...tracker.stats,
            currentAborts: tracker.aborts.length,
            abortsAvailable: status.abortsRemaining,
            isInCooldown: status.isInCooldown,
            warningLevel: status.warningLevel
        };
    }

    /**
     * Manually trigger cooldown (for testing or user request)
     */
    async triggerCooldown(durationMs = COOLDOWN_DURATION) {
        const tracker = await this.getTracker();

        tracker.cooldown = {
            active: true,
            startTime: Date.now(),
            endTime: Date.now() + durationMs,
            abortsAtLimit: tracker.aborts.length,
            manual: true
        };

        await this.saveTracker(tracker);
        this.invalidateCache();

        return tracker.cooldown;
    }

    /**
     * Clear cooldown (admin/testing)
     */
    async clearCooldown() {
        const tracker = await this.getTracker();

        tracker.cooldown = {
            active: false,
            lastEndTime: tracker.cooldown.endTime || Date.now()
        };

        await this.saveTracker(tracker);
        this.invalidateCache();

        return true;
    }

    /**
     * Reset tracker (clear all aborts)
     */
    async reset() {
        const tracker = this.createDefaultTracker();
        await this.saveTracker(tracker);
        this.invalidateCache();
        return true;
    }

    /**
     * Export abort history
     */
    async exportData() {
        const tracker = await this.getTracker();
        const status = await this.getStatus();

        return JSON.stringify({
            exportDate: new Date().toISOString(),
            version: '1.6.0',
            currentStatus: status,
            abortHistory: tracker.aborts,
            statistics: tracker.stats,
            cooldownHistory: tracker.cooldown
        }, null, 2);
    }

    // Helper methods

    createDefaultTracker() {
        return {
            aborts: [],
            cooldown: {
                active: false,
                startTime: null,
                endTime: null,
                lastEndTime: null
            },
            stats: {
                totalAborts: 0,
                abortsInWindow: 0,
                cooldownCount: 0,
                lastAbortTime: null
            },
            createdAt: Date.now()
        };
    }

    async saveTracker(tracker) {
        await chrome.storage.local.set({ [STORAGE_KEY]: tracker });
    }

    invalidateCache() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }

    generateId() {
        return `abort_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format time remaining for display
     */
    formatTimeRemaining(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }
}

// Export singleton instance
const abortTrackerService = new AbortTrackerService();
export default abortTrackerService;
