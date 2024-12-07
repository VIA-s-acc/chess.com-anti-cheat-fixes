import DebugService from './DebugService.js';

/**
 * Handles message passing between extension components
 */
class MessageService {
    static MESSAGE_SCHEMAS = {
        gameStateChanged: {
            required: ['updateType', 'data', 'timestamp'],
            updateTypes: ['opponent_detected', 'moves_updated', 'game_aborted']
        },
        showPopup: {
            required: ['gameId']
        },
        calculateRisk: {
            required: ['data'],
            dataRequired: ['username']
        },
        updateRiskScore: {
            required: ['data'],
            dataRequired: ['maxScore', 'otherFormats'],
            maxScoreRequired: ['value', 'format', 'factors']
        },
        closePopup: {
            required: []
        }
    };

    /**
     * Validate message structure
     * @param {Object} message - Message to validate
     * @returns {boolean} Is message valid
     * @throws {Error} Validation error details
     */
    static async validateMessage(message) {
        try {
            if (!message.action || !this.MESSAGE_SCHEMAS[message.action]) {
                throw new Error(`Invalid or missing action: ${message.action}`);
            }

            const schema = this.MESSAGE_SCHEMAS[message.action];

            // Check required fields
            for (const field of schema.required) {
                if (!(field in message)) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Check update type if applicable
            if (message.action === 'gameStateChanged') {
                if (!schema.updateTypes.includes(message.updateType)) {
                    throw new Error(`Invalid updateType: ${message.updateType}`);
                }
            }

            // Check data fields if specified
            if (schema.dataRequired && message.data) {
                for (const field of schema.dataRequired) {
                    if (!(field in message.data)) {
                        throw new Error(`Missing required data field: ${field}`);
                    }
                }
            }

            if (message.action === 'updateRiskScore') {
                const { maxScore, otherFormats } = message.data;
                
                // Validate maxScore structure
                for (const field of schema.maxScoreRequired) {
                    if (!(field in maxScore)) {
                        throw new Error(`Missing required maxScore field: ${field}`);
                    }
                }
                
                // Validate otherFormats array
                if (!Array.isArray(otherFormats)) {
                    throw new Error('otherFormats must be an array');
                }
                
                otherFormats.forEach((format, index) => {
                    if (!format.format || typeof format.score !== 'number') {
                        throw new Error(`Invalid format structure at index ${index}`);
                    }
                });
            }

            await DebugService.log('MessageService', 'Message validated', message);
            return true;
        } catch (error) {
            await DebugService.logError('MessageService', 'Message validation', error);
            throw error;
        }
    }

    /**
     * Send message to background script
     * @param {Object} message - Message to send
     * @returns {Promise<any>} Response from background script
     */
    static async sendToBackground(message) {
        try {
            await this.validateMessage(message);
            await DebugService.log('MessageService', 'Sending to background', message);
            const response = await chrome.runtime.sendMessage(message);
            await DebugService.log('MessageService', 'Background response', response);
            return response;
        } catch (error) {
            if (!error.message.includes('receiving end does not exist')) {
                await DebugService.logError('MessageService', 'Background send', error);
            }
            throw error;
        }
    }

    /**
     * Send message to content script
     * @param {number} tabId - Tab ID to send message to
     * @param {Object} message - Message to send
     * @returns {Promise<any>} Response from content script
     */
    static async sendToContent(tabId, message) {
        try {
            await this.validateMessage(message);
            await DebugService.log('MessageService', `Sending to content (Tab ${tabId})`, message);
            const response = await chrome.tabs.sendMessage(tabId, message);
            await DebugService.log('MessageService', 'Content response', response);
            return response;
        } catch (error) {
            await DebugService.logError('MessageService', 'Content send', error);
            throw error;
        }
    }

    /**
     * Send message with retry
     * @param {Function} sendFn - Message sending function
     * @param {Array} args - Arguments for sending function
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise<any>} Response from receiver
     */
    static async sendWithRetry(sendFn, args, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    await DebugService.log('MessageService', 'Retry attempt', { attempt, maxRetries });
                }
                return await sendFn(...args);
            } catch (error) {
                lastError = error;
                if (error.message.includes('receiving end does not exist')) {
                    await DebugService.log('MessageService', 'Receiver not exists, stopping retries');
                    break;
                }
                await DebugService.logError('MessageService', `Retry attempt ${attempt + 1}`, error);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        
        throw lastError;
    }
}

export default MessageService; 