/**
 * StatisticsView.js
 * Component for displaying personal analytics and statistics
 */

import StatisticsService from '../services/StatisticsService.js';
import GlobalDatabaseService from '../services/GlobalDatabaseService.js';

class StatisticsView {
    constructor(container) {
        this.container = container;
        this.statsService = StatisticsService;
        this.globalDbService = GlobalDatabaseService;
        this.currentTimeFilter = 'all'; // all, 24h, 7d, 30d
    }

    /**
     * Render the statistics view
     */
    async render() {
        try {
            // Get statistics data
            const stats = await this.statsService.getStatistics(this.currentTimeFilter);

            // Get global DB status
            await this.globalDbService.loadConfig();
            const status = this.globalDbService.getStatus();
            const isGlobalDbEnabled = status.enabled;

            this.container.innerHTML = `
                <div class="statistics-container">
                    <!-- Time Filter -->
                    <div class="time-filter">
                        <button class="filter-btn ${this.currentTimeFilter === '24h' ? 'active' : ''}" data-filter="24h">24h</button>
                        <button class="filter-btn ${this.currentTimeFilter === '7d' ? 'active' : ''}" data-filter="7d">7d</button>
                        <button class="filter-btn ${this.currentTimeFilter === '30d' ? 'active' : ''}" data-filter="30d">30d</button>
                        <button class="filter-btn ${this.currentTimeFilter === 'all' ? 'active' : ''}" data-filter="all">All Time</button>
                    </div>

                    <!-- Key Metrics -->
                    <div class="metrics-grid">
                        ${this.renderMetricCard('Games Analyzed', stats.totalGamesAnalyzed, '🎮')}
                        ${this.renderMetricCard('Suspicious Players', stats.suspiciousEncounters, '⚠️')}
                        ${this.renderMetricCard('Abort Effectiveness', stats.abortEffectiveness + '%', '🛡️')}
                        ${this.renderMetricCard('Win Rate vs Suspicious', stats.winRateVsSuspicious + '%', '🏆')}
                    </div>

                    <!-- Risk Distribution -->
                    <div class="stats-section">
                        <h3 class="stats-section-title">Risk Distribution</h3>
                        <div class="risk-distribution">
                            ${this.renderRiskBar('Low', stats.riskDistribution.low, '#22c55e')}
                            ${this.renderRiskBar('Medium', stats.riskDistribution.medium, '#eab308')}
                            ${this.renderRiskBar('High', stats.riskDistribution.high, '#f97316')}
                            ${this.renderRiskBar('Critical', stats.riskDistribution.critical, '#ef4444')}
                        </div>
                    </div>

                    <!-- Format Breakdown -->
                    <div class="stats-section">
                        <h3 class="stats-section-title">Game Format Breakdown</h3>
                        <div class="format-breakdown">
                            ${this.renderFormatItem('Bullet', stats.formatBreakdown.bullet)}
                            ${this.renderFormatItem('Blitz', stats.formatBreakdown.blitz)}
                            ${this.renderFormatItem('Rapid', stats.formatBreakdown.rapid)}
                        </div>
                    </div>

                    <!-- Suspicious Players Percentage -->
                    <div class="stats-section">
                        <h3 class="stats-section-title">Suspicious Players Rate</h3>
                        <div class="suspicious-rate">
                            <div class="rate-value">${stats.suspiciousPercentage}%</div>
                            <div class="rate-label">of games against suspicious opponents</div>
                        </div>
                    </div>

                    <!-- Top Suspicious Players -->
                    <div class="stats-section">
                        <h3 class="stats-section-title">Top 10 Most Suspicious Players</h3>
                        ${stats.topSuspiciousPlayers.length === 0 ?
                            '<div class="no-data">No suspicious players encountered yet</div>' :
                            '<div class="top-players-list">' +
                                stats.topSuspiciousPlayers.map((player, index) =>
                                    this.renderTopPlayer(player, index + 1)
                                ).join('') +
                            '</div>'
                        }
                    </div>

                    <!-- Global Database Status -->
                    ${isGlobalDbEnabled ? `
                        <div class="stats-section">
                            <h3 class="stats-section-title">Global Database Status</h3>
                            <div id="global-db-status-container">
                                <div class="loading-spinner">Loading...</div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Export Statistics -->
                    <div class="stats-section">
                        <button id="export-stats-btn" class="export-btn">
                            📊 Export Statistics
                        </button>
                        <button id="reset-stats-btn" class="reset-btn">
                            🔄 Reset Statistics
                        </button>
                    </div>
                </div>
            `;

            // Attach event listeners
            this.attachEventListeners();

            // Load global DB status if enabled
            if (isGlobalDbEnabled) {
                this.loadGlobalDbStatus();
            }

        } catch (error) {
            console.error('[StatisticsView] Error rendering statistics:', error);
            this.container.innerHTML = `
                <div class="error-message">
                    <p>Failed to load statistics</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Render a metric card
     */
    renderMetricCard(title, value, icon) {
        return `
            <div class="metric-card">
                <div class="metric-icon">${icon}</div>
                <div class="metric-content">
                    <div class="metric-value">${value}</div>
                    <div class="metric-title">${title}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render a risk distribution bar
     */
    renderRiskBar(label, count, color) {
        const total = count || 0;
        return `
            <div class="risk-bar-item">
                <div class="risk-bar-label">${label}</div>
                <div class="risk-bar-container">
                    <div class="risk-bar-fill" style="background-color: ${color}; width: 0%" data-width="${total}">
                    </div>
                </div>
                <div class="risk-bar-count">${total}</div>
            </div>
        `;
    }

    /**
     * Render format item
     */
    renderFormatItem(format, stats) {
        const total = stats.total || 0;
        const suspicious = stats.suspicious || 0;
        const percentage = total > 0 ? Math.round((suspicious / total) * 100) : 0;

        return `
            <div class="format-item">
                <div class="format-header">
                    <span class="format-name">${format}</span>
                    <span class="format-count">${total} games</span>
                </div>
                <div class="format-suspicious">
                    ${suspicious} suspicious (${percentage}%)
                </div>
            </div>
        `;
    }

    /**
     * Render top player item
     */
    renderTopPlayer(player, rank) {
        const riskClass = this.getRiskClass(player.highestRiskScore);

        return `
            <div class="top-player-item">
                <div class="player-rank">#${rank}</div>
                <div class="player-info">
                    <div class="player-name">${player.username}</div>
                    <div class="player-details">
                        <span class="player-encounters">${player.encounterCount} encounters</span>
                        <span class="player-risk ${riskClass}">${Math.round(player.averageRiskScore)}% avg risk</span>
                    </div>
                </div>
                <div class="player-highest-risk ${riskClass}">
                    ${Math.round(player.highestRiskScore)}%
                </div>
            </div>
        `;
    }

    /**
     * Get risk level class
     */
    getRiskClass(score) {
        if (score >= 80) return 'critical';
        if (score >= 65) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }

    /**
     * Load global database status
     */
    async loadGlobalDbStatus() {
        const container = document.getElementById('global-db-status-container');
        if (!container) return;

        try {
            const healthCheck = await this.globalDbService.checkHealth();

            if (healthCheck.available && healthCheck.data) {
                const data = healthCheck.data;
                container.innerHTML = `
                    <div class="global-db-info">
                        <div class="db-info-row">
                            <span class="db-info-label">Status:</span>
                            <span class="db-info-value status-connected">● Connected</span>
                        </div>
                        <div class="db-info-row">
                            <span class="db-info-label">Total Reports:</span>
                            <span class="db-info-value">${data.total_reports}</span>
                        </div>
                        <div class="db-info-row">
                            <span class="db-info-label">Server Version:</span>
                            <span class="db-info-value">${data.version}</span>
                        </div>
                        <div class="db-info-row">
                            <span class="db-info-label">Uptime:</span>
                            <span class="db-info-value">${data.uptime}</span>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="global-db-info">
                        <div class="db-info-row">
                            <span class="db-info-label">Status:</span>
                            <span class="db-info-value status-disconnected">● Unavailable</span>
                        </div>
                        <div class="db-info-message">
                            Server is not responding. Check server URL in settings.
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('[StatisticsView] Error loading global DB status:', error);
            container.innerHTML = `
                <div class="global-db-info">
                    <div class="db-info-row">
                        <span class="db-info-label">Status:</span>
                        <span class="db-info-value status-error">● Error</span>
                    </div>
                    <div class="db-info-message">${error.message}</div>
                </div>
            `;
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Time filter buttons
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const filter = e.target.dataset.filter;
                this.currentTimeFilter = filter;
                await this.render();
            });
        });

        // Export button
        const exportBtn = document.getElementById('export-stats-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportStatistics());
        }

        // Reset button
        const resetBtn = document.getElementById('reset-stats-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetStatistics());
        }

        // Animate risk bars
        this.animateRiskBars();
    }

    /**
     * Animate risk distribution bars
     */
    animateRiskBars() {
        const bars = this.container.querySelectorAll('.risk-bar-fill');

        // Calculate max value for scaling
        let maxValue = 0;
        bars.forEach(bar => {
            const value = parseInt(bar.dataset.width);
            if (value > maxValue) maxValue = value;
        });

        // Animate each bar
        bars.forEach(bar => {
            const value = parseInt(bar.dataset.width);
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

            // Smooth animation
            setTimeout(() => {
                bar.style.width = `${percentage}%`;
            }, 100);
        });
    }

    /**
     * Export statistics to JSON
     */
    async exportStatistics() {
        try {
            const stats = await this.statsService.getStatistics('all');
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '2.0.0',
                statistics: stats
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chess-anticheat-stats-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showMessage('Statistics exported successfully', 'success');
        } catch (error) {
            console.error('[StatisticsView] Error exporting statistics:', error);
            this.showMessage('Failed to export statistics', 'error');
        }
    }

    /**
     * Reset statistics (with confirmation)
     */
    async resetStatistics() {
        if (!confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            return;
        }

        try {
            await this.statsService.resetStatistics();
            await this.render();
            this.showMessage('Statistics reset successfully', 'success');
        } catch (error) {
            console.error('[StatisticsView] Error resetting statistics:', error);
            this.showMessage('Failed to reset statistics', 'error');
        }
    }

    /**
     * Show temporary message
     */
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `stats-message stats-message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                document.body.removeChild(messageDiv);
            }, 300);
        }, 3000);
    }
}

export default StatisticsView;
