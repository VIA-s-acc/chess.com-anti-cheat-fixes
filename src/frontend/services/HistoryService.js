/**
 * History Service - Manages scoring history storage and retrieval
 * @version 1.2.0
 */

const HISTORY_STORAGE_KEY = 'scoring_history';
const MAX_HISTORY_ENTRIES = 100;

class HistoryService {
    constructor() {
        this.cache = null;
        this.lastFetch = 0;
        this.CACHE_TTL = 5000; // 5 seconds
    }

    /**
     * Save a risk score calculation to history
     * @param {Object} entry - Scoring entry
     * @param {string} entry.username - Opponent username
     * @param {string} entry.gameId - Game ID
     * @param {Object} entry.riskScore - Risk score data
     * @param {Object} entry.playerStats - Player statistics
     * @returns {Promise<boolean>} Success status
     */
    async saveEntry(entry) {
        try {
            const history = await this.getHistory();

            const newEntry = {
                id: this.generateId(),
                timestamp: Date.now(),
                ...entry
            };

            // Check for duplicates (same user, same game)
            const existingIndex = history.findIndex(
                e => e.username === entry.username && e.gameId === entry.gameId
            );

            if (existingIndex >= 0) {
                // Update existing entry
                history[existingIndex] = newEntry;
                console.log('[HistoryService] Updated existing entry for', entry.username);
            } else {
                // Add new entry at the beginning
                history.unshift(newEntry);
                console.log('[HistoryService] Added new entry for', entry.username);
            }

            // Enforce max entries limit
            if (history.length > MAX_HISTORY_ENTRIES) {
                const removed = history.splice(MAX_HISTORY_ENTRIES);
                console.log(`[HistoryService] Removed ${removed.length} old entries`);
            }

            await this.saveHistory(history);
            this.invalidateCache();

            return true;
        } catch (error) {
            console.error('[HistoryService] Error saving entry:', error);
            return false;
        }
    }

    /**
     * Get all history entries
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} History entries
     */
    async getHistory(options = {}) {
        try {
            // Use cache if valid
            if (this.cache && (Date.now() - this.lastFetch < this.CACHE_TTL)) {
                return this.applyFilters(this.cache, options);
            }

            const result = await chrome.storage.local.get(HISTORY_STORAGE_KEY);
            const history = result[HISTORY_STORAGE_KEY] || [];

            this.cache = history;
            this.lastFetch = Date.now();

            return this.applyFilters(history, options);
        } catch (error) {
            console.error('[HistoryService] Error loading history:', error);
            return [];
        }
    }

    /**
     * Apply filters to history entries
     * @param {Array} history - History entries
     * @param {Object} options - Filter options
     * @returns {Array} Filtered entries
     */
    applyFilters(history, options) {
        let filtered = [...history];

        // Filter by username (search)
        if (options.search) {
            const search = options.search.toLowerCase();
            filtered = filtered.filter(e =>
                e.username.toLowerCase().includes(search)
            );
        }

        // Filter by date range
        if (options.dateFrom) {
            filtered = filtered.filter(e => e.timestamp >= options.dateFrom);
        }
        if (options.dateTo) {
            filtered = filtered.filter(e => e.timestamp <= options.dateTo);
        }

        // Filter by format
        if (options.format && options.format !== 'all') {
            filtered = filtered.filter(e =>
                e.riskScore?.format === options.format
            );
        }

        // Filter by risk level
        if (options.riskLevel && options.riskLevel !== 'all') {
            filtered = filtered.filter(e => {
                const score = e.riskScore?.overall || 0;
                switch (options.riskLevel) {
                    case 'low': return score < 30;
                    case 'medium': return score >= 30 && score < 60;
                    case 'high': return score >= 60 && score < 80;
                    case 'critical': return score >= 80;
                    default: return true;
                }
            });
        }

        // Sort
        if (options.sortBy) {
            filtered = this.sortEntries(filtered, options.sortBy, options.sortOrder || 'desc');
        }

        // Pagination
        if (options.page !== undefined && options.perPage) {
            const start = options.page * options.perPage;
            const end = start + options.perPage;
            filtered = filtered.slice(start, end);
        }

        return filtered;
    }

    /**
     * Sort history entries
     * @param {Array} entries - Entries to sort
     * @param {string} field - Field to sort by
     * @param {string} order - Sort order (asc/desc)
     * @returns {Array} Sorted entries
     */
    sortEntries(entries, field, order = 'desc') {
        const sorted = [...entries];

        sorted.sort((a, b) => {
            let aVal, bVal;

            switch (field) {
                case 'date':
                    aVal = a.timestamp;
                    bVal = b.timestamp;
                    break;
                case 'username':
                    aVal = a.username.toLowerCase();
                    bVal = b.username.toLowerCase();
                    break;
                case 'riskScore':
                    aVal = a.riskScore?.overall || 0;
                    bVal = b.riskScore?.overall || 0;
                    break;
                default:
                    return 0;
            }

            if (order === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return sorted;
    }

    /**
     * Delete a single entry by ID
     * @param {string} id - Entry ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteEntry(id) {
        try {
            const history = await this.getHistory();
            const filtered = history.filter(e => e.id !== id);

            if (filtered.length === history.length) {
                console.warn('[HistoryService] Entry not found:', id);
                return false;
            }

            await this.saveHistory(filtered);
            this.invalidateCache();

            console.log('[HistoryService] Deleted entry:', id);
            return true;
        } catch (error) {
            console.error('[HistoryService] Error deleting entry:', error);
            return false;
        }
    }

    /**
     * Clear all history
     * @returns {Promise<boolean>} Success status
     */
    async clearAll() {
        try {
            await chrome.storage.local.remove(HISTORY_STORAGE_KEY);
            this.invalidateCache();

            console.log('[HistoryService] Cleared all history');
            return true;
        } catch (error) {
            console.error('[HistoryService] Error clearing history:', error);
            return false;
        }
    }

    /**
     * Get statistics from history
     * @returns {Promise<Object>} Statistics
     */
    async getStatistics() {
        const history = await this.getHistory();

        if (history.length === 0) {
            return {
                totalEntries: 0,
                averageRisk: 0,
                distribution: { low: 0, medium: 0, high: 0, critical: 0 },
                formatBreakdown: {},
                oldestEntry: null,
                newestEntry: null
            };
        }

        const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
        const formatCounts = {};
        let totalRisk = 0;

        history.forEach(entry => {
            const score = entry.riskScore?.overall || 0;
            totalRisk += score;

            // Risk distribution
            if (score < 30) distribution.low++;
            else if (score < 60) distribution.medium++;
            else if (score < 80) distribution.high++;
            else distribution.critical++;

            // Format breakdown
            const format = entry.riskScore?.format || 'unknown';
            formatCounts[format] = (formatCounts[format] || 0) + 1;
        });

        return {
            totalEntries: history.length,
            averageRisk: Math.round(totalRisk / history.length),
            distribution,
            formatBreakdown: formatCounts,
            oldestEntry: history[history.length - 1]?.timestamp,
            newestEntry: history[0]?.timestamp
        };
    }

    /**
     * Export history to JSON
     * @returns {Promise<string>} JSON string
     */
    async exportJSON() {
        const history = await this.getHistory();
        return JSON.stringify(history, null, 2);
    }

    /**
     * Export history to CSV
     * @returns {Promise<string>} CSV string
     */
    async exportCSV() {
        const history = await this.getHistory();

        const headers = ['Username', 'Risk Score', 'Format', 'Date', 'Game ID', 'Rating'];
        const rows = history.map(entry => [
            entry.username,
            entry.riskScore?.overall || 0,
            entry.riskScore?.format || '',
            new Date(entry.timestamp).toISOString(),
            entry.gameId || '',
            entry.playerStats?.rating || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        return csv;
    }

    /**
     * Generate unique ID for entry
     * @returns {string} Unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save history to storage
     * @param {Array} history - History entries
     * @returns {Promise<void>}
     */
    async saveHistory(history) {
        await chrome.storage.local.set({
            [HISTORY_STORAGE_KEY]: history
        });
    }

    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.cache = null;
        this.lastFetch = 0;
    }
}

// Export singleton instance
const historyService = new HistoryService();
export default historyService;
