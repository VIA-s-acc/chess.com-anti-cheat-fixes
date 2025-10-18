/**
 * History View Component - Displays scoring history in popup
 * @version 1.2.0
 */

import historyService from '../services/HistoryService.js';

class HistoryView {
    constructor(container) {
        this.container = container;
        this.currentPage = 0;
        this.perPage = 10;
        this.searchQuery = '';
        this.filters = {
            format: 'all',
            riskLevel: 'all',
            dateFrom: null,
            dateTo: null
        };
        this.sortBy = 'date';
        this.sortOrder = 'desc';
    }

    /**
     * Render the history view
     */
    async render() {
        const history = await this.getFilteredHistory();
        const stats = await historyService.getStatistics();

        this.container.innerHTML = `
            <div class="history-view">
                <!-- Search and Filter Bar -->
                <div class="history-controls">
                    <div class="search-box">
                        <input
                            type="text"
                            id="history-search"
                            placeholder="Search username..."
                            value="${this.searchQuery}"
                        >
                        <span class="search-icon">🔍</span>
                    </div>

                    <div class="filter-row">
                        <select id="filter-format" class="filter-select">
                            <option value="all">All Formats</option>
                            <option value="rapid">Rapid</option>
                            <option value="blitz">Blitz</option>
                            <option value="bullet">Bullet</option>
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
                        </select>
                    </div>
                </div>

                <!-- Statistics Summary -->
                <div class="history-stats">
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalEntries}</div>
                        <div class="stat-label">Total Analyzed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.averageRisk}%</div>
                        <div class="stat-label">Avg Risk</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.distribution.high + stats.distribution.critical}</div>
                        <div class="stat-label">High Risk</div>
                    </div>
                </div>

                <!-- History List -->
                <div class="history-list">
                    ${history.length === 0 ? this.renderEmptyState() : this.renderHistoryItems(history)}
                </div>

                <!-- Pagination and Actions -->
                <div class="history-footer">
                    <div class="pagination">
                        <button id="prev-page" ${this.currentPage === 0 ? 'disabled' : ''}>←</button>
                        <span class="page-info">Page ${this.currentPage + 1}</span>
                        <button id="next-page" ${history.length < this.perPage ? 'disabled' : ''}>→</button>
                    </div>

                    <div class="history-actions">
                        <button id="export-json" class="action-btn">Export JSON</button>
                        <button id="export-csv" class="action-btn">Export CSV</button>
                        <button id="clear-history" class="action-btn danger">Clear All</button>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render empty state when no history
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-title">No History Yet</div>
                <div class="empty-message">
                    Risk scores will be automatically saved here as you analyze opponents.
                </div>
            </div>
        `;
    }

    /**
     * Render history items
     */
    renderHistoryItems(history) {
        return history.map(entry => {
            const score = entry.riskScore?.overall || 0;
            const riskLevel = this.getRiskLevel(score);
            const icon = this.getRiskIcon(riskLevel);
            const date = this.formatDate(entry.timestamp);

            return `
                <div class="history-item" data-id="${entry.id}">
                    <div class="history-item-icon ${riskLevel}">${icon}</div>
                    <div class="history-item-content">
                        <div class="history-item-header">
                            <span class="history-username">${this.escapeHtml(entry.username)}</span>
                            <span class="history-score ${riskLevel}">${score}%</span>
                        </div>
                        <div class="history-item-meta">
                            <span class="history-format">${entry.riskScore?.format || 'Unknown'}</span>
                            <span class="history-date">${date}</span>
                        </div>
                    </div>
                    <button class="history-item-delete" data-id="${entry.id}" title="Delete entry">×</button>
                </div>
            `;
        }).join('');
    }

    /**
     * Get filtered and sorted history
     */
    async getFilteredHistory() {
        return await historyService.getHistory({
            search: this.searchQuery,
            format: this.filters.format,
            riskLevel: this.filters.riskLevel,
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo,
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
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 0;
                this.render();
            });
        }

        // Filters
        const formatFilter = document.getElementById('filter-format');
        if (formatFilter) {
            formatFilter.value = this.filters.format;
            formatFilter.addEventListener('change', (e) => {
                this.filters.format = e.target.value;
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

        // Export buttons
        const exportJsonBtn = document.getElementById('export-json');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportJSON());
        }

        const exportCsvBtn = document.getElementById('export-csv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }

        // Clear history
        const clearBtn = document.getElementById('clear-history');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearHistory());
        }

        // Delete individual entries
        const deleteButtons = document.querySelectorAll('.history-item-delete');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                this.deleteEntry(id);
            });
        });

        // Click on history item to view details (future feature)
        const historyItems = document.querySelectorAll('.history-item');
        historyItems.forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                this.showEntryDetails(id);
            });
        });
    }

    /**
     * Export history to JSON
     */
    async exportJSON() {
        try {
            const json = await historyService.exportJSON();
            this.downloadFile('chess-history.json', json, 'application/json');
        } catch (error) {
            console.error('Failed to export JSON:', error);
            alert('Failed to export history');
        }
    }

    /**
     * Export history to CSV
     */
    async exportCSV() {
        try {
            const csv = await historyService.exportCSV();
            this.downloadFile('chess-history.csv', csv, 'text/csv');
        } catch (error) {
            console.error('Failed to export CSV:', error);
            alert('Failed to export history');
        }
    }

    /**
     * Clear all history
     */
    async clearHistory() {
        if (!confirm('Are you sure you want to delete all history? This cannot be undone.')) {
            return;
        }

        try {
            await historyService.clearAll();
            this.currentPage = 0;
            this.render();
        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear history');
        }
    }

    /**
     * Delete a single entry
     */
    async deleteEntry(id) {
        try {
            await historyService.deleteEntry(id);
            this.render();
        } catch (error) {
            console.error('Failed to delete entry:', error);
            alert('Failed to delete entry');
        }
    }

    /**
     * Show entry details (placeholder for future feature)
     */
    showEntryDetails(id) {
        console.log('Show details for entry:', id);
        // TODO: Implement detail view in future version
    }

    /**
     * Download file
     */
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

    /**
     * Get risk level from score
     */
    getRiskLevel(score) {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 30) return 'medium';
        return 'low';
    }

    /**
     * Get icon for risk level
     */
    getRiskIcon(level) {
        const icons = {
            low: '✅',
            medium: '⚠️',
            high: '🔴',
            critical: '🚨'
        };
        return icons[level] || '❓';
    }

    /**
     * Format date to relative time
     */
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

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default HistoryView;
