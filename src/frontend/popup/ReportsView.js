/**
 * Reports View Component - Display and manage reported users
 * @version 1.4.0
 */

import reportsService from '../services/ReportsService.js';

class ReportsView {
    constructor(container) {
        this.container = container;
        this.currentPage = 0;
        this.perPage = 10;
        this.searchQuery = '';
        this.filters = {
            status: 'all',
            riskLevel: 'all'
        };
        this.sortBy = 'date';
        this.sortOrder = 'desc';
    }

    /**
     * Render the reports view
     */
    async render() {
        const reports = await this.getFilteredReports();
        const stats = await reportsService.getStatistics();

        this.container.innerHTML = `
            <div class="reports-view">
                <!-- Search and Filter Bar -->
                <div class="reports-controls">
                    <div class="search-box">
                        <input
                            type="text"
                            id="reports-search"
                            placeholder="Search username..."
                            value="${this.searchQuery}"
                        >
                        <span class="search-icon">🔍</span>
                    </div>

                    <div class="filter-row">
                        <select id="filter-status" class="filter-select">
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="banned">Banned</option>
                            <option value="closed">Closed</option>
                        </select>

                        <select id="filter-risk" class="filter-select">
                            <option value="all">All Risk Levels</option>
                            <option value="low">Low (0-30)</option>
                            <option value="medium">Medium (30-60)</option>
                            <option value="high">High (60-80)</option>
                            <option value="critical">Critical (80+)</option>
                        </select>

                        <select id="sort-by" class="filter-select">
                            <option value="date">Date</option>
                            <option value="username">Username</option>
                            <option value="riskScore">Risk Score</option>
                            <option value="status">Status</option>
                            <option value="lastChecked">Last Checked</option>
                        </select>
                    </div>
                </div>

                <!-- Statistics Summary -->
                <div class="reports-stats">
                    <div class="stat-item">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Reported</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value stat-value-danger">${stats.byStatus.banned || 0}</div>
                        <div class="stat-label">Banned</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value stat-value-warning">${stats.needingCheck}</div>
                        <div class="stat-label">Need Check</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value stat-value-success">${stats.recentBans}</div>
                        <div class="stat-label">Recent Bans</div>
                    </div>
                </div>

                <!-- Reports List -->
                <div class="reports-list">
                    ${reports.length === 0 ? this.renderEmptyState() : this.renderReportItems(reports)}
                </div>

                <!-- Pagination and Actions -->
                <div class="reports-footer">
                    <div class="pagination">
                        <button id="prev-page" ${this.currentPage === 0 ? 'disabled' : ''}>←</button>
                        <span class="page-info">Page ${this.currentPage + 1}</span>
                        <button id="next-page" ${reports.length < this.perPage ? 'disabled' : ''}>→</button>
                    </div>

                    <div class="reports-actions">
                        <button id="check-all-btn" class="action-btn">
                            Check All
                        </button>
                        <button id="export-reports-json" class="action-btn">Export JSON</button>
                        <button id="export-reports-csv" class="action-btn">Export CSV</button>
                        <button id="clear-reports" class="action-btn danger">Clear All</button>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">No Reports Yet</div>
                <div class="empty-message">
                    Users you report will appear here. Their account status will be checked automatically every week.
                </div>
            </div>
        `;
    }

    /**
     * Render report items
     */
    renderReportItems(reports) {
        return reports.map(report => {
            const score = report.highestRiskScore || 0;
            const riskLevel = this.getRiskLevel(score);
            const statusIcon = this.getStatusIcon(report.status);
            const statusColor = this.getStatusColor(report.status);
            const date = this.formatDate(report.reportedAt);
            const lastChecked = report.lastChecked
                ? this.formatDate(report.lastChecked)
                : 'Never';
            const needsCheck = this.needsStatusCheck(report);

            return `
                <div class="report-item" data-id="${report.id}">
                    <div class="report-item-header">
                        <div class="report-item-left">
                            <span class="report-status-icon ${statusColor}">${statusIcon}</span>
                            <div class="report-item-info">
                                <div class="report-username">${this.escapeHtml(report.username)}</div>
                                <div class="report-meta">
                                    <span class="report-status ${statusColor}">${report.status}</span>
                                    <span class="report-separator">•</span>
                                    <span class="report-risk ${riskLevel}">${score}% risk</span>
                                    <span class="report-separator">•</span>
                                    <span>${report.encounters || 1}x</span>
                                </div>
                            </div>
                        </div>
                        <div class="report-item-right">
                            <button class="report-check-btn ${needsCheck ? 'needs-check' : ''}"
                                    data-id="${report.id}"
                                    title="Check account status">
                                🔄
                            </button>
                            <button class="report-delete-btn"
                                    data-id="${report.id}"
                                    title="Delete report">
                                ×
                            </button>
                        </div>
                    </div>
                    <div class="report-item-details">
                        <div class="report-detail-row">
                            <span class="detail-label">Reported:</span>
                            <span class="detail-value">${date}</span>
                        </div>
                        <div class="report-detail-row">
                            <span class="detail-label">Last Checked:</span>
                            <span class="detail-value ${needsCheck ? 'text-warning' : ''}">${lastChecked}</span>
                        </div>
                        ${report.accountStatus ? `
                            <div class="report-detail-row">
                                <span class="detail-label">Account:</span>
                                <span class="detail-value">${report.accountStatus.message}</span>
                            </div>
                        ` : ''}
                        ${report.reason ? `
                            <div class="report-detail-row">
                                <span class="detail-label">Reason:</span>
                                <span class="detail-value">${this.escapeHtml(report.reason)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Get filtered and sorted reports
     */
    async getFilteredReports() {
        return await reportsService.getReports({
            search: this.searchQuery,
            status: this.filters.status,
            riskLevel: this.filters.riskLevel,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            page: this.currentPage,
            perPage: this.perPage
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search
        const searchInput = document.getElementById('reports-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 0;
                this.render();
            });
        }

        // Filters
        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) {
            statusFilter.value = this.filters.status;
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.currentPage = 0;
                this.render();
            });
        }

        const riskFilter = document.getElementById('filter-risk');
        if (riskFilter) {
            riskFilter.value = this.filters.riskLevel;
            riskFilter.addEventListener('change', (e) => {
                this.filters.riskLevel = e.target.value;
                this.currentPage = 0;
                this.render();
            });
        }

        // Sort
        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) {
            sortSelect.value = this.sortBy;
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.render();
            });
        }

        // Pagination
        const prevBtn = document.getElementById('prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 0) {
                    this.currentPage--;
                    this.render();
                }
            });
        }

        const nextBtn = document.getElementById('next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.render();
            });
        }

        // Check all button
        const checkAllBtn = document.getElementById('check-all-btn');
        if (checkAllBtn) {
            checkAllBtn.addEventListener('click', () => this.checkAllStatuses());
        }

        // Export buttons
        const exportJsonBtn = document.getElementById('export-reports-json');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportJSON());
        }

        const exportCsvBtn = document.getElementById('export-reports-csv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }

        // Clear reports
        const clearBtn = document.getElementById('clear-reports');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearReports());
        }

        // Individual check buttons
        const checkButtons = document.querySelectorAll('.report-check-btn');
        checkButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                await this.checkReportStatus(id, btn);
            });
        });

        // Delete buttons
        const deleteButtons = document.querySelectorAll('.report-delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                this.deleteReport(id);
            });
        });
    }

    /**
     * Check status for a single report
     */
    async checkReportStatus(id, button) {
        try {
            button.textContent = '⏳';
            button.disabled = true;

            await reportsService.updateReportAccountStatus(id);
            await this.render();
        } catch (error) {
            console.error('Failed to check report status:', error);
            alert('Failed to check account status');
            button.textContent = '🔄';
            button.disabled = false;
        }
    }

    /**
     * Check all report statuses
     */
    async checkAllStatuses() {
        if (!confirm('Check status for all reports? This may take a while.')) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'checkReportStatuses'
            });

            if (response.success) {
                await this.render();
                alert('Status check completed!');
            } else {
                alert('Failed to check statuses: ' + response.error);
            }
        } catch (error) {
            console.error('Failed to trigger status check:', error);
            alert('Failed to check statuses');
        }
    }

    /**
     * Export reports to JSON
     */
    async exportJSON() {
        try {
            const json = await reportsService.exportJSON();
            this.downloadFile('chess-reports.json', json, 'application/json');
        } catch (error) {
            console.error('Failed to export JSON:', error);
            alert('Failed to export reports');
        }
    }

    /**
     * Export reports to CSV
     */
    async exportCSV() {
        try {
            const csv = await reportsService.exportCSV();
            this.downloadFile('chess-reports.csv', csv, 'text/csv');
        } catch (error) {
            console.error('Failed to export CSV:', error);
            alert('Failed to export reports');
        }
    }

    /**
     * Clear all reports
     */
    async clearReports() {
        if (!confirm('Are you sure you want to delete ALL reports? This cannot be undone.')) {
            return;
        }

        try {
            await reportsService.clearAll();
            this.currentPage = 0;
            this.render();
        } catch (error) {
            console.error('Failed to clear reports:', error);
            alert('Failed to clear reports');
        }
    }

    /**
     * Delete a single report
     */
    async deleteReport(id) {
        try {
            await reportsService.deleteReport(id);
            this.render();
        } catch (error) {
            console.error('Failed to delete report:', error);
            alert('Failed to delete report');
        }
    }

    /**
     * Helper methods
     */

    getRiskLevel(score) {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 30) return 'medium';
        return 'low';
    }

    getStatusIcon(status) {
        const icons = {
            pending: '⏳',
            active: '👤',
            banned: '🚫',
            closed: '❌'
        };
        return icons[status] || '❓';
    }

    getStatusColor(status) {
        const colors = {
            pending: 'status-pending',
            active: 'status-active',
            banned: 'status-banned',
            closed: 'status-closed'
        };
        return colors[status] || '';
    }

    needsStatusCheck(report) {
        if (report.status === 'banned' || report.status === 'closed') {
            return false;
        }
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return !report.lastChecked || report.lastChecked < weekAgo;
    }

    formatDate(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) {
            return new Date(timestamp).toLocaleDateString();
        } else if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export default ReportsView;
