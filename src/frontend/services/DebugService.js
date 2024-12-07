/**
 * Service for managing debug functionality
 */
class DebugService {
    constructor() {
        this.storageKey = 'chessRiskScore_debug';
    }

    /**
     * Get debug state
     * @returns {Promise<boolean>} Debug enabled state
     */
    async isEnabled() {
        const data = await chrome.storage.local.get(this.storageKey);
        return !!data[this.storageKey];
    }

    /**
     * Toggle debug mode
     * @returns {Promise<boolean>} New debug state
     */
    async toggle() {
        const currentState = await this.isEnabled();
        const newState = !currentState;
        await chrome.storage.local.set({ [this.storageKey]: newState });
        return newState;
    }

    /**
     * Log debug message if debug mode is enabled
     * @param {string} component - Component name
     * @param {string} action - Action description
     * @param {Object} data - Data to log
     */
    async log(component, action, data = {}) {
        if (await this.isEnabled()) {
            console.log(
                `%c[${component}] %c${action}`,
                'color: #69923e; font-weight: bold',
                'color: #4b4847',
                data
            );
        }
    }

    /**
     * Log error in debug mode
     * @param {string} component - Component name
     * @param {string} action - Action description
     * @param {Error} error - Error object
     */
    async logError(component, action, error) {
        if (await this.isEnabled()) {
            console.error(
                `%c[${component}] %cError in ${action}:`,
                'color: #ff0000; font-weight: bold',
                'color: #4b4847',
                error
            );
        }
    }
}

export default new DebugService(); 