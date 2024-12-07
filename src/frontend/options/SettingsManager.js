import { SETTINGS } from '../../config.js';

const STORAGE_KEY = 'chessRiskScore_settings';

class SettingsManager {
    constructor() {
        // Default settings from config.js
        this.defaultSettings = {
            SETTINGS: { ...SETTINGS }
        };
    }

    async loadSettings() {
        try {
            // Use chrome.storage.local.get with the key directly
            const result = await chrome.storage.local.get('SETTINGS');
            console.debug('Raw storage result:', result);
            return { SETTINGS: result.SETTINGS || this.defaultSettings.SETTINGS };
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.defaultSettings;
        }
    }

    async saveSettings(settings) {
        try {
            if (!this.validateSettings(settings)) {
                throw new Error('Invalid settings format');
            }

            // Save just the SETTINGS object directly
            await chrome.storage.local.set({
                SETTINGS: settings.SETTINGS
            });
            console.debug('Settings saved:', settings.SETTINGS);
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    async restoreDefaults() {
        try {
            // Remove the SETTINGS key
            await chrome.storage.local.remove('SETTINGS');
            return this.defaultSettings;
        } catch (error) {
            console.error('Error restoring defaults:', error);
            throw error;
        }
    }

    validateSettings(settings) {
        try {
            // Check general settings
            if (typeof settings.SETTINGS.RATED_ONLY !== 'boolean') return false;
            if (typeof settings.SETTINGS.AUTO_OPEN_POPUP !== 'boolean') return false;
            return true;
        } catch (error) {
            console.error('Error validating settings:', error);
            return false;
        }
    }
}

export default new SettingsManager(); 