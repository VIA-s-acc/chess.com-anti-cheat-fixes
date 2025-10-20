/**
 * ThresholdSettingsService
 *
 * Manages custom risk score thresholds and configuration settings.
 * Allows users to customize detection sensitivity and import/export configs.
 */

import {
    ACCURACY_THRESHOLDS,
    WEIGHTS,
    THRESHOLDS,
    WINRATE_THRESHOLDS,
    HIGH_ACCURACY_THRESHOLDS
} from '../../config.js';

const STORAGE_KEY = 'chessRiskScore_thresholds';
const CONFIG_VERSION = '1.0';

class ThresholdSettingsService {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes

        // Default thresholds from config.js
        this.defaultThresholds = {
            version: CONFIG_VERSION,

            // Risk level thresholds (what scores trigger warnings)
            riskLevels: {
                low: 30,        // 0-30: Low risk (green)
                medium: 50,     // 30-50: Medium risk (yellow)
                high: 70,       // 50-70: High risk (orange)
                critical: 85    // 70+: Critical risk (red)
            },

            // Action button thresholds
            actionThresholds: {
                showAbortButton: 60,    // Show abort/skip buttons at this score
                autoWarn: 75,           // Automatically warn at this score
                criticalAlert: 90       // Critical alert at this score
            },

            // Accuracy detection thresholds
            accuracy: {
                lowRating: {
                    threshold: ACCURACY_THRESHOLDS.LOW_RATING.threshold,
                    requiredAccuracy: ACCURACY_THRESHOLDS.LOW_RATING.requiredAccuracy
                },
                highRating: {
                    threshold: ACCURACY_THRESHOLDS.HIGH_RATING.threshold,
                    requiredAccuracy: ACCURACY_THRESHOLDS.HIGH_RATING.requiredAccuracy
                }
            },

            // Score calculation weights
            weights: {
                overallWinrate: WEIGHTS.OVERALL_WINRATE,
                recentWinrate: WEIGHTS.RECENT_WINRATE,
                highAccuracy: WEIGHTS.HIGH_ACCURACY
            },

            // Game analysis thresholds
            gameAnalysis: {
                accountAgeDays: THRESHOLDS.ACCOUNT_AGE_DAYS,
                minGames: THRESHOLDS.MIN_GAMES,
                accountAgeMultiplier: THRESHOLDS.ACCOUNT_AGE_MULTIPLIER,
                weightingK: THRESHOLDS.WEIGHTING_K,
                winrate: {
                    baseline: THRESHOLDS.WINRATE.BASELINE,
                    suspicious: THRESHOLDS.WINRATE.SUSPICIOUS,
                    highRisk: THRESHOLDS.WINRATE.HIGH_RISK
                }
            },

            // Winrate detection parameters
            winrateDetection: {
                lowThreshold: WINRATE_THRESHOLDS.LOW_WINRATE_THRESHOLD,
                mediumThreshold: WINRATE_THRESHOLDS.MEDIUM_WINRATE_THRESHOLD,
                highThreshold: WINRATE_THRESHOLDS.HIGH_WINRATE_THRESHOLD,
                highMultiplier: WINRATE_THRESHOLDS.HIGH_WINRATE_MULTIPLIER,
                mediumMultiplier: WINRATE_THRESHOLDS.MEDIUM_WINRATE_MULTIPLIER,
                baseScore: WINRATE_THRESHOLDS.BASE_SCORE,
                extendedScore: WINRATE_THRESHOLDS.EXTENDED_SCORE,
                scaleFactor: WINRATE_THRESHOLDS.SCALE_FACTOR,
                significantDiff: WINRATE_THRESHOLDS.SIGNIFICANT_DIFF,
                maxScore: WINRATE_THRESHOLDS.MAX_SCORE,
                combinedWeightFactor: WINRATE_THRESHOLDS.COMBINED_WEIGHT_FACTOR
            },

            // High accuracy detection parameters
            highAccuracyDetection: {
                moderateSuspicionThreshold: HIGH_ACCURACY_THRESHOLDS.MODERATE_SUSPICION_THRESHOLD,
                highSuspicionThreshold: HIGH_ACCURACY_THRESHOLDS.HIGH_SUSPICION_THRESHOLD,
                extremeSuspicionThreshold: HIGH_ACCURACY_THRESHOLDS.EXTREME_SUSPICION_THRESHOLD,
                suspicionScaleFactor: HIGH_ACCURACY_THRESHOLDS.SUSPICION_SCALE_FACTOR,
                moderateMaxScore: HIGH_ACCURACY_THRESHOLDS.MODERATE_MAX_SCORE,
                highMaxScore: HIGH_ACCURACY_THRESHOLDS.HIGH_MAX_SCORE,
                extremeScoreIncrement: HIGH_ACCURACY_THRESHOLDS.EXTREME_SCORE_INCREMENT,
                extremeScoreStep: HIGH_ACCURACY_THRESHOLDS.EXTREME_SCORE_STEP
            }
        };
    }

    /**
     * Get current thresholds (with caching)
     */
    async getThresholds() {
        // Check cache
        if (this.cache && this.cacheTimestamp &&
            (Date.now() - this.cacheTimestamp < this.cacheTTL)) {
            return this.cache;
        }

        try {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const thresholds = result[STORAGE_KEY] || this.defaultThresholds;

            // Merge with defaults to ensure all properties exist
            const merged = this.mergeWithDefaults(thresholds);

            // Update cache
            this.cache = merged;
            this.cacheTimestamp = Date.now();

            return merged;
        } catch (error) {
            console.error('[ThresholdSettings] Failed to load thresholds:', error);
            return this.defaultThresholds;
        }
    }

    /**
     * Save custom thresholds
     */
    async saveThresholds(thresholds) {
        try {
            // Validate thresholds
            if (!this.validateThresholds(thresholds)) {
                throw new Error('Invalid threshold configuration');
            }

            // Add version and timestamp
            const config = {
                ...thresholds,
                version: CONFIG_VERSION,
                lastModified: Date.now()
            };

            await chrome.storage.local.set({ [STORAGE_KEY]: config });

            // Clear cache
            this.cache = null;
            this.cacheTimestamp = null;

            console.log('[ThresholdSettings] Thresholds saved successfully');
            return { success: true };
        } catch (error) {
            console.error('[ThresholdSettings] Failed to save thresholds:', error);
            throw error;
        }
    }

    /**
     * Reset to default thresholds
     */
    async resetToDefaults() {
        try {
            await chrome.storage.local.remove(STORAGE_KEY);

            // Clear cache
            this.cache = null;
            this.cacheTimestamp = null;

            console.log('[ThresholdSettings] Reset to default thresholds');
            return { success: true };
        } catch (error) {
            console.error('[ThresholdSettings] Failed to reset thresholds:', error);
            throw error;
        }
    }

    /**
     * Export current configuration as JSON
     */
    async exportConfig() {
        try {
            const thresholds = await this.getThresholds();
            const config = {
                ...thresholds,
                exportDate: new Date().toISOString(),
                version: CONFIG_VERSION
            };

            const blob = new Blob([JSON.stringify(config, null, 2)], {
                type: 'application/json'
            });

            return {
                success: true,
                blob,
                filename: `chess-anticheat-config-${Date.now()}.json`
            };
        } catch (error) {
            console.error('[ThresholdSettings] Failed to export config:', error);
            throw error;
        }
    }

    /**
     * Import configuration from JSON file
     */
    async importConfig(fileContent) {
        try {
            // Parse JSON
            const config = JSON.parse(fileContent);

            // Validate structure
            if (!this.validateThresholds(config)) {
                throw new Error('Invalid configuration file format');
            }

            // Version compatibility check
            if (config.version && config.version !== CONFIG_VERSION) {
                console.warn(`[ThresholdSettings] Config version mismatch: ${config.version} vs ${CONFIG_VERSION}`);
            }

            // Remove metadata fields
            delete config.exportDate;
            delete config.lastModified;

            // Save imported config
            await this.saveThresholds(config);

            console.log('[ThresholdSettings] Configuration imported successfully');
            return { success: true };
        } catch (error) {
            console.error('[ThresholdSettings] Failed to import config:', error);
            throw error;
        }
    }

    /**
     * Validate threshold configuration
     */
    validateThresholds(config) {
        try {
            // Check required top-level properties
            if (!config.riskLevels || !config.actionThresholds) {
                return false;
            }

            // Validate risk levels
            const { riskLevels } = config;
            if (typeof riskLevels.low !== 'number' ||
                typeof riskLevels.medium !== 'number' ||
                typeof riskLevels.high !== 'number' ||
                typeof riskLevels.critical !== 'number') {
                return false;
            }

            // Ensure risk levels are in ascending order
            if (riskLevels.low >= riskLevels.medium ||
                riskLevels.medium >= riskLevels.high ||
                riskLevels.high >= riskLevels.critical) {
                return false;
            }

            // Validate all values are in valid ranges (0-100)
            if (riskLevels.low < 0 || riskLevels.critical > 100) {
                return false;
            }

            // Validate action thresholds
            const { actionThresholds } = config;
            if (typeof actionThresholds.showAbortButton !== 'number' ||
                typeof actionThresholds.autoWarn !== 'number' ||
                typeof actionThresholds.criticalAlert !== 'number') {
                return false;
            }

            // Validate weights sum to ~1.0 if present
            if (config.weights) {
                const sum = config.weights.overallWinrate +
                           config.weights.recentWinrate +
                           config.weights.highAccuracy;
                if (Math.abs(sum - 1.0) > 0.01) {
                    console.warn('[ThresholdSettings] Weights do not sum to 1.0:', sum);
                }
            }

            return true;
        } catch (error) {
            console.error('[ThresholdSettings] Validation error:', error);
            return false;
        }
    }

    /**
     * Merge user config with defaults to ensure all properties exist
     */
    mergeWithDefaults(userConfig) {
        return {
            version: userConfig.version || this.defaultThresholds.version,
            riskLevels: {
                ...this.defaultThresholds.riskLevels,
                ...userConfig.riskLevels
            },
            actionThresholds: {
                ...this.defaultThresholds.actionThresholds,
                ...userConfig.actionThresholds
            },
            accuracy: {
                lowRating: {
                    ...this.defaultThresholds.accuracy.lowRating,
                    ...(userConfig.accuracy?.lowRating || {})
                },
                highRating: {
                    ...this.defaultThresholds.accuracy.highRating,
                    ...(userConfig.accuracy?.highRating || {})
                }
            },
            weights: {
                ...this.defaultThresholds.weights,
                ...userConfig.weights
            },
            gameAnalysis: {
                ...this.defaultThresholds.gameAnalysis,
                ...(userConfig.gameAnalysis || {}),
                winrate: {
                    ...this.defaultThresholds.gameAnalysis.winrate,
                    ...(userConfig.gameAnalysis?.winrate || {})
                }
            },
            winrateDetection: {
                ...this.defaultThresholds.winrateDetection,
                ...userConfig.winrateDetection
            },
            highAccuracyDetection: {
                ...this.defaultThresholds.highAccuracyDetection,
                ...userConfig.highAccuracyDetection
            }
        };
    }

    /**
     * Get risk level name based on score
     */
    async getRiskLevel(score) {
        const thresholds = await this.getThresholds();
        const { riskLevels } = thresholds;

        if (score < riskLevels.low) return 'minimal';
        if (score < riskLevels.medium) return 'low';
        if (score < riskLevels.high) return 'medium';
        if (score < riskLevels.critical) return 'high';
        return 'critical';
    }

    /**
     * Get preset configurations (for quick selection)
     */
    getPresets() {
        return {
            conservative: {
                name: 'Conservative',
                description: 'Higher thresholds, fewer false positives',
                config: {
                    ...this.defaultThresholds,
                    riskLevels: { low: 40, medium: 60, high: 80, critical: 95 },
                    actionThresholds: { showAbortButton: 75, autoWarn: 85, criticalAlert: 95 }
                }
            },
            balanced: {
                name: 'Balanced (Default)',
                description: 'Standard detection sensitivity',
                config: this.defaultThresholds
            },
            aggressive: {
                name: 'Aggressive',
                description: 'Lower thresholds, catch more suspects',
                config: {
                    ...this.defaultThresholds,
                    riskLevels: { low: 20, medium: 40, high: 60, critical: 80 },
                    actionThresholds: { showAbortButton: 50, autoWarn: 65, criticalAlert: 80 }
                }
            },
            paranoid: {
                name: 'Paranoid',
                description: 'Very low thresholds, maximum sensitivity',
                config: {
                    ...this.defaultThresholds,
                    riskLevels: { low: 15, medium: 30, high: 50, critical: 70 },
                    actionThresholds: { showAbortButton: 40, autoWarn: 55, criticalAlert: 70 }
                }
            }
        };
    }

    /**
     * Apply a preset configuration
     */
    async applyPreset(presetName) {
        const presets = this.getPresets();
        const preset = presets[presetName];

        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }

        await this.saveThresholds(preset.config);
        return { success: true, preset: preset.name };
    }
}

export default new ThresholdSettingsService();
