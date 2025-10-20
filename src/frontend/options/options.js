import SettingsManager from './SettingsManager.js';
import ThresholdSettingsService from '../services/ThresholdSettingsService.js';

class OptionsManager {
    constructor() {
        this.settingsManager = SettingsManager;
        this.thresholdService = ThresholdSettingsService;
        this.setupEventListeners();
        this.loadSettings();
        this.loadThresholds();
    }

    async loadSettings() {
        try {
            const settings = await this.settingsManager.loadSettings();
            console.debug('Loading settings into UI:', settings);

            // Load general settings and force UI update
            const ratedOnlyToggle = document.getElementById('RATED_ONLY');
            const autoOpenToggle = document.getElementById('AUTO_OPEN_POPUP');

            if (ratedOnlyToggle && autoOpenToggle) {
                ratedOnlyToggle.checked = settings.SETTINGS.RATED_ONLY;
                autoOpenToggle.checked = settings.SETTINGS.AUTO_OPEN_POPUP;

                // Dispatch change event to ensure UI updates
                ratedOnlyToggle.dispatchEvent(new Event('change'));
                autoOpenToggle.dispatchEvent(new Event('change'));
            } else {
                console.error('Toggle elements not found in DOM');
            }
        } catch (error) {
            this.showError('Failed to load settings');
            console.error('Error loading settings:', error);
        }
    }

    async loadThresholds() {
        try {
            const thresholds = await this.thresholdService.getThresholds();
            console.debug('Loading thresholds into UI:', thresholds);

            // Load risk level thresholds
            document.getElementById('threshold-medium').value = thresholds.riskLevels.medium;
            document.getElementById('threshold-high').value = thresholds.riskLevels.high;
            document.getElementById('threshold-critical').value = thresholds.riskLevels.critical;

            // Load action thresholds
            document.getElementById('threshold-abort-button').value = thresholds.actionThresholds.showAbortButton;
            document.getElementById('threshold-auto-warn').value = thresholds.actionThresholds.autoWarn;
            document.getElementById('threshold-critical-alert').value = thresholds.actionThresholds.criticalAlert;

            // Update visual feedback
            this.updateThresholdValues();

            // Check if it matches a preset
            this.updatePresetSelection(thresholds);
        } catch (error) {
            this.showError('Failed to load thresholds');
            console.error('Error loading thresholds:', error);
        }
    }

    async saveSettings() {
        try {
            // Save general settings
            const settings = {
                SETTINGS: {
                    RATED_ONLY: document.getElementById('RATED_ONLY').checked,
                    AUTO_OPEN_POPUP: document.getElementById('AUTO_OPEN_POPUP').checked
                }
            };

            await this.settingsManager.saveSettings(settings);

            // Save thresholds
            await this.saveThresholds();

            this.showSuccess('All settings saved successfully');
        } catch (error) {
            this.showError('Failed to save settings: ' + error.message);
            console.error('Error saving settings:', error);
        }
    }

    async saveThresholds() {
        try {
            const thresholds = {
                riskLevels: {
                    low: 0, // Fixed minimum
                    medium: parseInt(document.getElementById('threshold-medium').value),
                    high: parseInt(document.getElementById('threshold-high').value),
                    critical: parseInt(document.getElementById('threshold-critical').value)
                },
                actionThresholds: {
                    showAbortButton: parseInt(document.getElementById('threshold-abort-button').value),
                    autoWarn: parseInt(document.getElementById('threshold-auto-warn').value),
                    criticalAlert: parseInt(document.getElementById('threshold-critical-alert').value)
                }
            };

            // Validate threshold order
            if (thresholds.riskLevels.medium >= thresholds.riskLevels.high ||
                thresholds.riskLevels.high >= thresholds.riskLevels.critical) {
                throw new Error('Thresholds must be in ascending order: Medium < High < Critical');
            }

            // Get current full config and merge
            const currentThresholds = await this.thresholdService.getThresholds();
            const updatedThresholds = {
                ...currentThresholds,
                ...thresholds
            };

            await this.thresholdService.saveThresholds(updatedThresholds);

            console.log('[Options] Thresholds saved successfully');
        } catch (error) {
            console.error('[Options] Failed to save thresholds:', error);
            throw error;
        }
    }

    async applyPreset(presetName) {
        try {
            if (!presetName) return; // Custom configuration

            const result = await this.thresholdService.applyPreset(presetName);
            await this.loadThresholds();

            this.showSuccess(`Applied "${result.preset}" preset`);
        } catch (error) {
            this.showError('Failed to apply preset: ' + error.message);
            console.error('Error applying preset:', error);
        }
    }

    async resetThresholds() {
        const confirmed = confirm(
            'Reset all thresholds to factory defaults?\n\n' +
            'This will restore:\n' +
            '- Risk level thresholds\n' +
            '- Action button thresholds\n' +
            '- All detection parameters\n\n' +
            'This cannot be undone.'
        );

        if (!confirmed) return;

        try {
            await this.thresholdService.resetToDefaults();
            await this.loadThresholds();

            this.showSuccess('Thresholds reset to defaults');
        } catch (error) {
            this.showError('Failed to reset thresholds: ' + error.message);
            console.error('Error resetting thresholds:', error);
        }
    }

    async exportConfig() {
        try {
            const result = await this.thresholdService.exportConfig();

            // Create download link
            const url = URL.createObjectURL(result.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Configuration exported successfully');
        } catch (error) {
            this.showError('Failed to export configuration: ' + error.message);
            console.error('Error exporting config:', error);
        }
    }

    async importConfig(file) {
        try {
            const fileContent = await this.readFile(file);
            await this.thresholdService.importConfig(fileContent);
            await this.loadThresholds();

            this.showSuccess('Configuration imported successfully');
        } catch (error) {
            this.showError('Failed to import configuration: ' + error.message);
            console.error('Error importing config:', error);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    updateThresholdValues() {
        // Update visual value displays
        const inputs = document.querySelectorAll('.threshold-input');
        inputs.forEach(input => {
            const valueSpan = input.parentElement.querySelector('.threshold-value');
            if (valueSpan) {
                valueSpan.textContent = `${input.value}`;
            }
        });
    }

    updatePresetSelection(thresholds) {
        const presets = this.thresholdService.getPresets();
        const presetSelect = document.getElementById('preset-select');

        // Check if current config matches any preset
        let matchingPreset = null;
        for (const [key, preset] of Object.entries(presets)) {
            const presetConfig = preset.config;
            if (presetConfig.riskLevels.medium === thresholds.riskLevels.medium &&
                presetConfig.riskLevels.high === thresholds.riskLevels.high &&
                presetConfig.riskLevels.critical === thresholds.riskLevels.critical) {
                matchingPreset = key;
                break;
            }
        }

        presetSelect.value = matchingPreset || '';
    }

    setupEventListeners() {
        // Save button
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Preset selection
        document.getElementById('preset-select').addEventListener('change', (e) => {
            this.applyPreset(e.target.value);
        });

        // Threshold inputs - update visual feedback on change
        const thresholdInputs = document.querySelectorAll('.threshold-input');
        thresholdInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateThresholdValues();
                // Set preset to custom when user manually changes values
                document.getElementById('preset-select').value = '';
            });
        });

        // Export config
        document.getElementById('export-config-btn').addEventListener('click', () => {
            this.exportConfig();
        });

        // Import config
        document.getElementById('import-config-btn').addEventListener('click', () => {
            document.getElementById('import-config-file').click();
        });

        document.getElementById('import-config-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importConfig(e.target.files[0]);
                e.target.value = ''; // Reset file input
            }
        });

        // Reset button
        document.getElementById('reset-thresholds-btn').addEventListener('click', () => {
            this.resetThresholds();
        });
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Remove existing message
        const existing = document.querySelector('.message');
        if (existing) {
            existing.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Insert at top of container
        const container = document.querySelector('.options-container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.optionsManager = new OptionsManager();
});
