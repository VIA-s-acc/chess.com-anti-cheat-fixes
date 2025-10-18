/**
 * Reports Service - Track reported users and check account status
 * @version 1.4.0
 */

const STORAGE_KEY = 'reports';
const MAX_REPORTS = 500;
const CACHE_TTL = 5000; // 5 seconds

class ReportsService {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }

    /**
     * Add a new report for a user
     * @param {Object} report - Report details
     * @param {string} report.username - Chess.com username
     * @param {number} report.riskScore - Risk score at time of report
     * @param {string} report.gameId - Game ID where user was encountered
     * @param {string} report.reason - Reason for report (optional)
     * @param {Object} report.playerStats - Player statistics (optional)
     */
    async addReport(report) {
        const reports = await this.getReports();

        // Check if user is already reported
        const existingIndex = reports.findIndex(r => r.username === report.username);

        if (existingIndex !== -1) {
            // Update existing report
            reports[existingIndex] = {
                ...reports[existingIndex],
                lastUpdated: Date.now(),
                encounters: (reports[existingIndex].encounters || 1) + 1,
                games: [...new Set([...(reports[existingIndex].games || []), report.gameId])],
                highestRiskScore: Math.max(
                    reports[existingIndex].highestRiskScore || 0,
                    report.riskScore
                )
            };
        } else {
            // Create new report
            const newReport = {
                id: this.generateId(),
                username: report.username,
                riskScore: report.riskScore,
                highestRiskScore: report.riskScore,
                gameId: report.gameId,
                games: [report.gameId],
                reason: report.reason || 'Suspicious behavior detected',
                playerStats: report.playerStats || {},
                status: 'pending', // pending, active, closed, banned
                reportedAt: Date.now(),
                lastUpdated: Date.now(),
                lastChecked: null,
                encounters: 1,
                statusHistory: [{
                    status: 'pending',
                    timestamp: Date.now(),
                    note: 'Initial report created'
                }]
            };

            reports.unshift(newReport);
        }

        // Limit to MAX_REPORTS
        if (reports.length > MAX_REPORTS) {
            reports.splice(MAX_REPORTS);
        }

        await this.saveReports(reports);
        this.invalidateCache();

        return reports[existingIndex !== -1 ? existingIndex : 0];
    }

    /**
     * Get all reports with optional filtering
     */
    async getReports(options = {}) {
        // Check cache
        if (this.cache && (Date.now() - this.cacheTimestamp < CACHE_TTL)) {
            return this.filterReports(this.cache, options);
        }

        // Load from storage
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const reports = result[STORAGE_KEY] || [];

        // Update cache
        this.cache = reports;
        this.cacheTimestamp = Date.now();

        return this.filterReports(reports, options);
    }

    /**
     * Filter and sort reports
     */
    filterReports(reports, options) {
        let filtered = [...reports];

        // Filter by search query
        if (options.search) {
            const query = options.search.toLowerCase();
            filtered = filtered.filter(r =>
                r.username.toLowerCase().includes(query) ||
                r.reason?.toLowerCase().includes(query)
            );
        }

        // Filter by status
        if (options.status && options.status !== 'all') {
            filtered = filtered.filter(r => r.status === options.status);
        }

        // Filter by risk level
        if (options.riskLevel && options.riskLevel !== 'all') {
            const ranges = {
                low: [0, 30],
                medium: [30, 60],
                high: [60, 80],
                critical: [80, 100]
            };
            const [min, max] = ranges[options.riskLevel] || [0, 100];
            filtered = filtered.filter(r =>
                r.highestRiskScore >= min && r.highestRiskScore < max
            );
        }

        // Filter by date range
        if (options.dateFrom) {
            filtered = filtered.filter(r => r.reportedAt >= options.dateFrom);
        }
        if (options.dateTo) {
            filtered = filtered.filter(r => r.reportedAt <= options.dateTo);
        }

        // Sort
        const sortBy = options.sortBy || 'date';
        const sortOrder = options.sortOrder || 'desc';

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = a.reportedAt - b.reportedAt;
                    break;
                case 'username':
                    comparison = a.username.localeCompare(b.username);
                    break;
                case 'riskScore':
                    comparison = (a.highestRiskScore || 0) - (b.highestRiskScore || 0);
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                case 'lastChecked':
                    comparison = (a.lastChecked || 0) - (b.lastChecked || 0);
                    break;
                default:
                    comparison = a.reportedAt - b.reportedAt;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        // Pagination
        if (options.page !== undefined && options.perPage) {
            const start = options.page * options.perPage;
            filtered = filtered.slice(start, start + options.perPage);
        }

        return filtered;
    }

    /**
     * Update report status
     */
    async updateReportStatus(id, status, note = '') {
        const reports = await this.getReports();
        const reportIndex = reports.findIndex(r => r.id === id);

        if (reportIndex === -1) {
            throw new Error('Report not found');
        }

        reports[reportIndex].status = status;
        reports[reportIndex].lastUpdated = Date.now();

        // Add to status history
        reports[reportIndex].statusHistory.push({
            status,
            timestamp: Date.now(),
            note
        });

        await this.saveReports(reports);
        this.invalidateCache();

        return reports[reportIndex];
    }

    /**
     * Check account status for a username
     * Returns account information from Chess.com API
     */
    async checkAccountStatus(username) {
        try {
            const response = await fetch(`https://api.chess.com/pub/player/${username}`);

            if (response.status === 404) {
                return {
                    exists: false,
                    status: 'not_found',
                    message: 'Account not found or deleted'
                };
            }

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();

            // Check if account is closed (Chess.com marks closed accounts)
            const isClosed = data.status === 'closed' ||
                           data.status === 'closed:fair_play_violations' ||
                           data.status === 'closed:abuse';

            return {
                exists: true,
                status: isClosed ? 'banned' : 'active',
                username: data.username,
                name: data.name,
                title: data.title,
                followers: data.followers,
                country: data.country,
                location: data.location,
                lastOnline: data.last_online,
                joined: data.joined,
                verified: data.verified,
                rawStatus: data.status,
                message: isClosed ? 'Account closed' : 'Account active'
            };
        } catch (error) {
            console.error('Error checking account status:', error);
            return {
                exists: null,
                status: 'error',
                message: `Error checking account: ${error.message}`
            };
        }
    }

    /**
     * Update report with latest account status
     */
    async updateReportAccountStatus(id) {
        const reports = await this.getReports();
        const reportIndex = reports.findIndex(r => r.id === id);

        if (reportIndex === -1) {
            throw new Error('Report not found');
        }

        const report = reports[reportIndex];
        const accountStatus = await this.checkAccountStatus(report.username);

        report.lastChecked = Date.now();
        report.accountStatus = accountStatus;

        // Auto-update status based on account status
        if (accountStatus.status === 'banned' && report.status !== 'banned') {
            report.status = 'banned';
            report.statusHistory.push({
                status: 'banned',
                timestamp: Date.now(),
                note: 'Account detected as closed/banned'
            });
        } else if (accountStatus.status === 'not_found' && report.status !== 'closed') {
            report.status = 'closed';
            report.statusHistory.push({
                status: 'closed',
                timestamp: Date.now(),
                note: 'Account not found'
            });
        }

        await this.saveReports(reports);
        this.invalidateCache();

        return report;
    }

    /**
     * Check all reports that need status update
     * Returns reports that haven't been checked in the specified interval
     */
    async getReportsNeedingCheck(intervalMs = 7 * 24 * 60 * 60 * 1000) { // 7 days default
        const reports = await this.getReports();
        const now = Date.now();

        return reports.filter(report => {
            // Skip already closed/banned reports
            if (report.status === 'banned' || report.status === 'closed') {
                return false;
            }

            // Check if never checked or past interval
            return !report.lastChecked || (now - report.lastChecked) >= intervalMs;
        });
    }

    /**
     * Batch check account statuses for multiple reports
     */
    async batchCheckStatuses(reportIds = null) {
        const reports = reportIds
            ? (await this.getReports()).filter(r => reportIds.includes(r.id))
            : await this.getReportsNeedingCheck();

        const results = [];

        for (const report of reports) {
            try {
                const updated = await this.updateReportAccountStatus(report.id);
                results.push({
                    id: report.id,
                    username: report.username,
                    success: true,
                    status: updated.accountStatus.status
                });

                // Add delay to avoid rate limiting
                await this.sleep(1000);
            } catch (error) {
                results.push({
                    id: report.id,
                    username: report.username,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get statistics about reports
     */
    async getStatistics() {
        const reports = await this.getReports();

        const stats = {
            total: reports.length,
            byStatus: {
                pending: 0,
                active: 0,
                closed: 0,
                banned: 0
            },
            byRiskLevel: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            },
            averageRisk: 0,
            needingCheck: 0,
            recentBans: 0
        };

        let totalRisk = 0;
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        reports.forEach(report => {
            // By status
            stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;

            // By risk level
            const risk = report.highestRiskScore || 0;
            totalRisk += risk;

            if (risk >= 80) stats.byRiskLevel.critical++;
            else if (risk >= 60) stats.byRiskLevel.high++;
            else if (risk >= 30) stats.byRiskLevel.medium++;
            else stats.byRiskLevel.low++;

            // Needing check
            if (!report.lastChecked || (Date.now() - report.lastChecked) > weekAgo) {
                stats.needingCheck++;
            }

            // Recent bans
            if (report.status === 'banned') {
                const bannedEntry = report.statusHistory.find(h => h.status === 'banned');
                if (bannedEntry && bannedEntry.timestamp > weekAgo) {
                    stats.recentBans++;
                }
            }
        });

        stats.averageRisk = reports.length > 0
            ? Math.round(totalRisk / reports.length)
            : 0;

        return stats;
    }

    /**
     * Delete a report
     */
    async deleteReport(id) {
        const reports = await this.getReports();
        const filtered = reports.filter(r => r.id !== id);

        if (filtered.length === reports.length) {
            throw new Error('Report not found');
        }

        await this.saveReports(filtered);
        this.invalidateCache();
        return true;
    }

    /**
     * Clear all reports
     */
    async clearAll() {
        await chrome.storage.local.remove(STORAGE_KEY);
        this.invalidateCache();
        return true;
    }

    /**
     * Export reports to JSON
     */
    async exportJSON() {
        const reports = await this.getReports();
        const stats = await this.getStatistics();

        return JSON.stringify({
            exportDate: new Date().toISOString(),
            version: '1.4.0',
            statistics: stats,
            reports
        }, null, 2);
    }

    /**
     * Export reports to CSV
     */
    async exportCSV() {
        const reports = await this.getReports();

        const headers = [
            'Username',
            'Status',
            'Highest Risk Score',
            'Encounters',
            'Games',
            'Reported Date',
            'Last Checked',
            'Account Status',
            'Reason'
        ];

        const rows = reports.map(r => [
            r.username,
            r.status,
            r.highestRiskScore || 0,
            r.encounters || 1,
            r.games?.length || 1,
            new Date(r.reportedAt).toLocaleDateString(),
            r.lastChecked ? new Date(r.lastChecked).toLocaleDateString() : 'Never',
            r.accountStatus?.status || 'Not checked',
            r.reason || ''
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return csv;
    }

    // Helper methods

    async saveReports(reports) {
        await chrome.storage.local.set({ [STORAGE_KEY]: reports });
    }

    invalidateCache() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }

    generateId() {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
const reportsService = new ReportsService();
export default reportsService;
