import SettingsManager from './SettingsManager.js';

class OptionsManager {
    constructor() {
        this.settingsManager = SettingsManager;
        this.setupEventListeners();
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const settings = await this.settingsManager.loadSettings();
            console.debug('Loading settings into UI:', settings);  // Debug log
            
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

    async saveSettings() {
        try {
            const settings = {
                SETTINGS: {
                    RATED_ONLY: document.getElementById('RATED_ONLY').checked,
                    AUTO_OPEN_POPUP: document.getElementById('AUTO_OPEN_POPUP').checked
                }
            };

            await this.settingsManager.saveSettings(settings);
            this.showSuccess('Settings saved');
        } catch (error) {
            this.showError('Failed to save settings: ' + error.message);
            console.error('Error saving settings:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
    }

    showError(message) {
        alert(message);
    }

    showSuccess(message) {
        console.log(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.optionsManager = new OptionsManager();
}); 