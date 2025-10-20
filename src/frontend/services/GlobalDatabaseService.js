/**
 * GlobalDatabaseService
 *
 * Manages integration with the global cheater database server.
 * Provides crowdsourced intelligence about suspicious players.
 *
 * @version 2.0.0
 */

const STORAGE_KEY = 'chessRiskScore_globalDb';
const DEFAULT_SERVER_URL = 'http://localhost:8000';

class GlobalDatabaseService {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
        this.serverUrl = null;
        this.isAvailable = false;
        this.lastHealthCheck = null;

        this.loadConfig();
    }

    /**
     * Load configuration from storage
     */
    async loadConfig() {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const config = result[STORAGE_KEY] || {};

            this.serverUrl = config.serverUrl || DEFAULT_SERVER_URL;
            this.enabled = config.enabled !== false; // enabled by default

            // Check health on startup if enabled
            if (this.enabled) {
                await this.checkHealth();
            }

            console.log('[GlobalDB] Configuration loaded:', {
                serverUrl: this.serverUrl,
                enabled: this.enabled,
                isAvailable: this.isAvailable
            });
        } catch (error) {
            console.error('[GlobalDB] Failed to load config:', error);
            this.serverUrl = DEFAULT_SERVER_URL;
            this.enabled = false;
        }
    }

    /**
     * Save configuration to storage
     */
    async saveConfig(config) {
        try {
            const currentConfig = {
                serverUrl: this.serverUrl,
                enabled: this.enabled,
                ...config
            };

            await chrome.storage.local.set({ [STORAGE_KEY]: currentConfig });

            // Update instance properties
            if (config.serverUrl !== undefined) {
                this.serverUrl = config.serverUrl;
            }
            if (config.enabled !== undefined) {
                this.enabled = config.enabled;
            }

            // Re-check health
            if (this.enabled) {
                await this.checkHealth();
            }

            console.log('[GlobalDB] Configuration saved:', currentConfig);
            return { success: true };
        } catch (error) {
            console.error('[GlobalDB] Failed to save config:', error);
            throw error;
        }
    }

    /**
     * Check server health
     */
    async checkHealth() {
        if (!this.enabled || !this.serverUrl) {
            this.isAvailable = false;
            return { available: false, reason: 'disabled' };
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                this.isAvailable = data.status === 'healthy';
                this.lastHealthCheck = Date.now();

                console.log('[GlobalDB] Health check passed:', data);
                return {
                    available: true,
                    data
                };
            } else {
                this.isAvailable = false;
                console.warn('[GlobalDB] Health check failed:', response.status);
                return {
                    available: false,
                    reason: `HTTP ${response.status}`
                };
            }
        } catch (error) {
            this.isAvailable = false;
            console.error('[GlobalDB] Health check error:', error.message);
            return {
                available: false,
                reason: error.name === 'AbortError' ? 'timeout' : error.message
            };
        }
    }

    /**
     * Submit a report to the global database
     */
    async submitReport(report) {
        if (!this.isAvailable) {
            console.warn('[GlobalDB] Server not available, skipping report submission');
            return { success: false, reason: 'server_unavailable' };
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/reports/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: report.username,
                    risk_score: report.riskScore,
                    game_format: report.format,
                    factors: report.factors,
                    notes: report.notes || null
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[GlobalDB] Report submitted:', data);

                // Invalidate cache for this player
                this.cache.delete(report.username.toLowerCase());

                return {
                    success: true,
                    data
                };
            } else {
                const error = await response.text();
                console.error('[GlobalDB] Failed to submit report:', error);
                return {
                    success: false,
                    reason: 'server_error',
                    error
                };
            }
        } catch (error) {
            console.error('[GlobalDB] Submit report error:', error);
            return {
                success: false,
                reason: 'network_error',
                error: error.message
            };
        }
    }

    /**
     * Get player reputation from global database
     */
    async getPlayerReputation(username) {
        if (!this.isAvailable) {
            return null;
        }

        const cacheKey = username.toLowerCase();

        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTTL) {
                console.log('[GlobalDB] Returning cached reputation for:', username);
                return cached.data;
            }
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/reports/player/${encodeURIComponent(username)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.found) {
                    // Cache the result
                    this.cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });

                    console.log('[GlobalDB] Got reputation for:', username, data);
                    return data;
                }

                return null;
            } else {
                console.error('[GlobalDB] Failed to get player reputation:', response.status);
                return null;
            }
        } catch (error) {
            console.error('[GlobalDB] Get reputation error:', error);
            return null;
        }
    }

    /**
     * Search for suspicious players
     */
    async searchSuspiciousPlayers(filters = {}) {
        if (!this.isAvailable) {
            return { players: [], total_found: 0 };
        }

        try {
            const params = new URLSearchParams({
                min_reports: filters.minReports || 3,
                min_risk_score: filters.minRiskScore || 70,
                limit: filters.limit || 50
            });

            if (filters.confidence) {
                params.append('confidence', filters.confidence);
            }

            const response = await fetch(`${this.serverUrl}/api/reports/search?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[GlobalDB] Search results:', data.total_found, 'players found');
                return data;
            } else {
                console.error('[GlobalDB] Search failed:', response.status);
                return { players: [], total_found: 0 };
            }
        } catch (error) {
            console.error('[GlobalDB] Search error:', error);
            return { players: [], total_found: 0 };
        }
    }

    /**
     * Get global statistics
     */
    async getGlobalStatistics() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/statistics/global`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[GlobalDB] Global statistics:', data);
                return data;
            } else {
                console.error('[GlobalDB] Failed to get statistics:', response.status);
                return null;
            }
        } catch (error) {
            console.error('[GlobalDB] Get statistics error:', error);
            return null;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            serverUrl: this.serverUrl,
            isAvailable: this.isAvailable,
            lastHealthCheck: this.lastHealthCheck,
            cacheSize: this.cache.size
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[GlobalDB] Cache cleared');
    }
}

export default new GlobalDatabaseService();
