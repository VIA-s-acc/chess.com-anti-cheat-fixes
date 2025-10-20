/**
 * Abort Status Component - Display abort counter and warnings
 * @version 1.8.0
 */

import ThresholdSettingsService from '../services/ThresholdSettingsService.js';

class AbortStatus {
    constructor(containerId = 'abort-status-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('[AbortStatus] Container not found:', containerId);
        }
        this.currentStatus = null;
        this.currentRiskScore = 0;
        this.thresholdService = ThresholdSettingsService;
    }

    /**
     * Update the abort status display
     * @param {Object} status - Status from AbortTrackerService
     * @param {number} riskScore - Current opponent risk score (optional)
     */
    async update(status, riskScore = 0) {
        if (!this.container) return;

        this.currentStatus = status;
        this.currentRiskScore = riskScore;

        const html = await this.renderStatus(status, riskScore);
        this.container.innerHTML = html;

        this.attachEventListeners();
    }

    /**
     * Render status HTML based on warning level
     */
    async renderStatus(status, riskScore = 0) {
        const {
            abortsUsed,
            abortsRemaining,
            abortLimit,
            isInCooldown,
            cooldownTimeRemaining,
            warningLevel,
            message
        } = status;

        // Get appropriate styling
        const colorClass = this.getColorClass(warningLevel);
        const icon = this.getIcon(warningLevel, isInCooldown);
        const barColor = this.getBarColor(warningLevel);

        // Calculate progress percentage
        const percentage = (abortsUsed / abortLimit) * 100;

        if (isInCooldown) {
            return this.renderCooldownView(status, icon, colorClass);
        }

        return `
            <div class="abort-status ${colorClass}">
                <div class="abort-status-header">
                    <span class="abort-icon">${icon}</span>
                    <span class="abort-title">Abort Counter</span>
                    <button id="abort-info-btn" class="info-btn" title="Learn more">ℹ️</button>
                </div>

                <div class="abort-counter">
                    <div class="abort-count ${colorClass}">
                        ${abortsUsed} / ${abortLimit}
                    </div>
                    <div class="abort-remaining">
                        ${abortsRemaining} ${abortsRemaining === 1 ? 'abort' : 'aborts'} remaining
                    </div>
                </div>

                <div class="abort-progress-bar">
                    <div class="abort-progress-fill ${barColor}" style="width: ${percentage}%"></div>
                </div>

                <div class="abort-message ${colorClass}">
                    ${message}
                </div>

                ${warningLevel !== 'safe' ? `
                    <div class="abort-warning-box">
                        ${this.getWarningMessage(warningLevel, abortsRemaining)}
                    </div>
                ` : ''}

                ${await this.shouldShowSkipButton(riskScore) ? `
                    <div class="skip-game-action" style="margin: 12px 0;">
                        <button id="skip-game-btn" class="action-btn abort-btn" style="width: 100%; padding: 10px; background-color: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; color: #ef4444; font-weight: 600;">
                            ⛔ Skip This Game (${abortsRemaining} aborts left)
                        </button>
                    </div>
                ` : ''}

                <div class="abort-actions">
                    <button id="view-abort-history" class="abort-action-btn">
                        📜 View History
                    </button>
                    <button id="reset-abort-counter" class="abort-action-btn" title="Reset counter (testing)">
                        🔄 Reset
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render cooldown view with countdown
     */
    renderCooldownView(status, icon, colorClass) {
        const timeRemaining = this.formatTime(status.cooldownTimeRemaining);

        return `
            <div class="abort-status abort-cooldown">
                <div class="abort-status-header">
                    <span class="abort-icon">${icon}</span>
                    <span class="abort-title">🛑 COOLDOWN ACTIVE</span>
                </div>

                <div class="cooldown-warning">
                    <div class="cooldown-timer" id="cooldown-timer">
                        ${timeRemaining}
                    </div>
                    <div class="cooldown-message">
                        <strong>⛔ STOP PLAYING NOW!</strong><br>
                        You cannot abort games during cooldown.<br>
                        If you face a cheater, you'll be forced to play or resign.
                    </div>
                </div>

                <div class="cooldown-recommendation">
                    <div class="recommendation-title">💡 Recommendations:</div>
                    <ul>
                        <li>Wait for cooldown to expire (~${timeRemaining} left)</li>
                        <li>Take a break or practice vs computer</li>
                        <li>Do NOT start new games</li>
                    </ul>
                </div>

                <div class="abort-actions">
                    <button id="view-abort-history" class="abort-action-btn">
                        📜 View History
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get warning message based on level
     */
    getWarningMessage(level, remaining) {
        if (level === 'danger') {
            return `
                <strong>⛔ AT LIMIT!</strong><br>
                One more abort will trigger cooldown.<br>
                Consider taking a break.
            `;
        }

        if (level === 'warning') {
            return `
                <strong>⚠️ WARNING!</strong><br>
                Only ${remaining} ${remaining === 1 ? 'abort' : 'aborts'} left before cooldown.<br>
                Be careful when starting new games.
            `;
        }

        return '';
    }

    /**
     * Attach event listeners to buttons
     */
    attachEventListeners() {
        const infoBtn = document.getElementById('abort-info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.showInfo());
        }

        const historyBtn = document.getElementById('view-abort-history');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showHistory());
        }

        const resetBtn = document.getElementById('reset-abort-counter');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetCounter());
        }

        const skipBtn = document.getElementById('skip-game-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipGame());
        }

        // Start countdown if in cooldown
        if (this.currentStatus?.isInCooldown) {
            this.startCountdown();
        }
    }

    /**
     * Start countdown timer for cooldown
     */
    startCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.countdownInterval = setInterval(async () => {
            const timerElement = document.getElementById('cooldown-timer');
            if (!timerElement) {
                clearInterval(this.countdownInterval);
                return;
            }

            // Get fresh status
            const response = await chrome.runtime.sendMessage({ action: 'getAbortStatus' });
            if (response.success) {
                const status = response.status;

                if (!status.isInCooldown) {
                    clearInterval(this.countdownInterval);
                    this.update(status); // Refresh to show normal view
                    return;
                }

                timerElement.textContent = this.formatTime(status.cooldownTimeRemaining);
            }
        }, 1000);
    }

    /**
     * Show info modal
     */
    showInfo() {
        alert(`Abort Counter - How it works:

Chess.com limits how many games you can abort to prevent abuse.

Rules:
• You can abort games with less than 2 moves made
• Limit: ~10 aborts per hour
• After hitting limit: ~15 minute cooldown
• During cooldown: You CANNOT abort games

Why this matters:
If you're in cooldown and face a cheater with high risk score, you won't be able to abort the game. You'll have to either:
- Play the full game (and likely lose rating)
- Resign immediately (and lose rating)

This counter helps you avoid that situation by warning you before you hit the limit.`);
    }

    /**
     * Show abort history
     */
    async showHistory() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getAbortHistory',
                limit: 10
            });

            if (response.success && response.history) {
                const history = response.history;

                if (history.length === 0) {
                    alert('No abort history found.');
                    return;
                }

                const historyText = history.map((abort, index) => {
                    const date = new Date(abort.timestamp).toLocaleString();
                    const opponent = abort.opponentUsername || 'Unknown';
                    return `${index + 1}. ${date} - vs ${opponent} (${abort.moveCount} moves)`;
                }).join('\n');

                alert(`Recent Aborts:\n\n${historyText}`);
            }
        } catch (error) {
            console.error('Failed to load abort history:', error);
            alert('Failed to load abort history');
        }
    }

    /**
     * Reset abort counter (for testing)
     */
    async resetCounter() {
        if (!confirm('Reset abort counter? This is for testing purposes only.')) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({ action: 'resetAbortTracker' });
            if (response.success) {
                // Get fresh status
                const statusResponse = await chrome.runtime.sendMessage({ action: 'getAbortStatus' });
                if (statusResponse.success) {
                    this.update(statusResponse.status, this.currentRiskScore);
                }
            }
        } catch (error) {
            console.error('Failed to reset counter:', error);
            alert('Failed to reset counter');
        }
    }

    /**
     * Skip the current game (abort)
     */
    skipGame() {
        const remaining = this.currentStatus?.abortsRemaining || 0;

        const confirmed = confirm(
            `⛔ Skip this high-risk opponent?\n\n` +
            `Risk Score: ${Math.round(this.currentRiskScore)}%\n` +
            `Aborts remaining: ${remaining}/${this.currentStatus?.abortLimit || 10}\n\n` +
            `You can only abort games with less than 2 moves.`
        );

        if (confirmed) {
            alert(
                `📌 To abort the game:\n\n` +
                `1. Go to the Chess.com game tab\n` +
                `2. Click the "Abort" button on the game board\n` +
                `3. The abort will be tracked automatically\n\n` +
                `This extension cannot abort games directly for security reasons.\n\n` +
                `Aborts left after this: ${remaining - 1}`
            );
        }
    }

    /**
     * Check if skip button should be shown based on custom threshold
     */
    async shouldShowSkipButton(riskScore) {
        try {
            const thresholds = await this.thresholdService.getThresholds();
            return riskScore >= thresholds.actionThresholds.showAbortButton;
        } catch (error) {
            console.error('[AbortStatus] Failed to get thresholds:', error);
            return riskScore >= 60; // Fallback to default
        }
    }

    /**
     * Helper methods
     */

    getColorClass(level) {
        const classes = {
            safe: 'status-safe',
            warning: 'status-warning',
            danger: 'status-danger'
        };
        return classes[level] || 'status-safe';
    }

    getIcon(level, isInCooldown) {
        if (isInCooldown) return '🛑';

        const icons = {
            safe: '✅',
            warning: '⚠️',
            danger: '⛔'
        };
        return icons[level] || '✅';
    }

    getBarColor(level) {
        const colors = {
            safe: 'bar-safe',
            warning: 'bar-warning',
            danger: 'bar-danger'
        };
        return colors[level] || 'bar-safe';
    }

    formatTime(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
}

export default AbortStatus;
