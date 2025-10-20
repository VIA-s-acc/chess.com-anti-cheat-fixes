import { SETTINGS } from '../../config.js';
import SettingsManager from '../options/SettingsManager.js';
import ThresholdSettingsService from '../services/ThresholdSettingsService.js';

export class RiskDisplay {
    constructor() {
        // Get DOM elements
        this.scoreCircle = document.getElementById('score-circle');
        this.scoreDisplay = document.getElementById('score-display');
        this.factors = document.getElementById('factors');

        // Circle circumference (2πr where r=45)
        this.circumference = 2 * Math.PI * 45;

        // Store last valid score
        this.lastValidScore = null;

        // Threshold service
        this.thresholdService = ThresholdSettingsService;
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (!this.lastValidScore) {
            this.scoreDisplay.innerHTML = `
                <div class="score-value">...</div>
                <div class="score-label">Loading</div>
            `;
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        if (!this.lastValidScore) {
            this.scoreCircle.setAttribute('class', 'score-progress risk-high');
            this.scoreDisplay.innerHTML = `
                <div class="score-value">!</div>
                <div class="score-label">${message}</div>
            `;
        }
    }

    /**
     * Update the display with risk score data
     */
    async updateDisplay(riskData) {
        console.debug('[RiskDisplay] Updating display with data:', riskData);
        
        // If opponent username is not available or equals the current player, show loading.
        if (!riskData.opponentUsername || (riskData.currentPlayer && riskData.opponentUsername === riskData.currentPlayer)) {
            console.debug('[RiskDisplay] Opponent not ready or matches current player. Showing loading state...');
            this.showLoading();
            return;
        }

        // Load current settings
        let userSettings;
        try {
            const settings = await SettingsManager.loadSettings();
            userSettings = settings.SETTINGS;
        } catch (error) {
            console.debug('Using default settings:', error);
            userSettings = SETTINGS;
        }

        // Update header with username
        const header = document.querySelector('.header');
        if (header) {
            const settingsIcon = header.querySelector('.settings-icon');
            header.textContent = `Risk Score: ${riskData.opponentUsername}`;
            if (settingsIcon) header.appendChild(settingsIcon);
            
            // Remove any existing game-info elements
            const existingInfo = document.querySelectorAll('.game-info');
            existingInfo.forEach(el => el.remove());
            
            // Add new game info after header with current setting status
            header.insertAdjacentHTML('afterend', `
                <div class="game-info">
                    Include: ${userSettings.RATED_ONLY ? 'Rated games only' : 'All games'}
                </div>
            `);
        }
        
        if (riskData.maxScore.reason === 'no_rated_games') {
            this.scoreCircle.setAttribute('stroke-dasharray', '0 283');
            this.scoreCircle.setAttribute('class', 'score-progress');
            
            this.scoreDisplay.innerHTML = `
                <div class="score-value">N/A</div>
                <div class="score-label">No rated games</div>
                <div class="risk-level text-muted">Risk score is only calculated for rated games</div>
            `;
            
            this.factors.innerHTML = `
                <div class="factor-item">
                    <div class="text-muted-center">
                        This player has no rated games in any format.
                        <br><br>
                        Risk score is only calculated for rated games.
                    </div>
                </div>
            `;
            return;
        }
        
        // Check if there's enough data to calculate risk
        if (!riskData?.maxScore?.format) {
            console.debug('[RiskDisplay] No format data available');
            // Show "not enough data" message
            this.scoreCircle.setAttribute('stroke-dasharray', '0 283');
            this.scoreCircle.setAttribute('class', 'score-progress');
            
            this.scoreDisplay.innerHTML = `
                <div class="score-value">N/A</div>
                <div class="score-label">Not enough information</div>
                <div class="risk-level text-muted">No recent games found</div>
            `;
            
            // Clear factors section
            this.factors.innerHTML = `
                <div class="factor-item">
                    <div class="text-muted-center">
                        Not enough information to calculate the risk score.
                        <br><br>
                        This usually means the player has no recent games in any format.
                    </div>
                </div>
            `;
            return;
        }

        const { maxScore, otherFormats } = riskData;
        const score = Math.round(maxScore.value || 0);
        const riskLevel = this.getRiskLevelText(score);
        const colorClass = await this.getRiskClass(score);

        // Store valid score
        this.lastValidScore = riskData;

        // Update circle progress
        const progress = (score / 100) * this.circumference;
        console.debug('[RiskDisplay] Setting circle progress:', progress, 'of', this.circumference);
        this.scoreCircle.setAttribute('stroke-dasharray', `${progress} ${this.circumference}`);
        this.scoreCircle.setAttribute('class', `score-progress ${colorClass}`);

        // Update score display below circle
        console.debug('[RiskDisplay] Updating score display:', score, riskLevel);
        this.scoreDisplay.innerHTML = `
            <div class="score-value ${colorClass}">${score}%</div>
            <div class="score-label">${maxScore.format.replace('chess_', '')}</div>
            <div class="risk-level ${colorClass}">${riskLevel}</div>
        `;

        // Update factors
        if (maxScore.factors) {
            console.debug('[RiskDisplay] Updating factors');
            await this.updateFactors(maxScore.factors, otherFormats);
        } else {
            console.debug('[RiskDisplay] No factors to update');
        }
    }

    /**
     * Update contributing factors section
     */
    async updateFactors(factors, otherFormats) {
        const sections = [];

        // Get custom thresholds
        const thresholds = await this.thresholdService.getThresholds();
        const abortButtonThreshold = thresholds.actionThresholds.showAbortButton;

        // Calculate overall risk score for action buttons
        const overallScore = this.lastValidScore?.maxScore?.value || 0;
        const isHighRisk = overallScore >= abortButtonThreshold; // Use custom threshold

        // Add action buttons at the top
        const actionButtons = `
            <div class="action-buttons" style="margin-bottom: 12px; display: flex; gap: 6px;">
                ${isHighRisk ? `
                    <button id="abort-game-btn" class="action-btn abort-btn" style="flex: 1; background-color: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #ef4444;">
                        ⛔ Abort Game
                    </button>
                ` : ''}
                <button id="report-user-btn" class="action-btn" style="flex: 1;">
                    📋 Report User
                </button>
            </div>
        `;
        sections.push(actionButtons);

        // Helper for factor formatting - pre-calculate risk classes
        const formatFactor = async (title, raw, weighted, games = null) => {
            const weightedClass = await this.getRiskClass(weighted);
            const rawClass = await this.getRiskClass(raw);
            return `
            <div class="factor-item">
                <div class="factor-header">
                    <span>${title}</span>
                    <span class="${rawClass}">${raw}%</span>
                </div>
                <div class="factor-details">
                    <div class="factor-score">
                        <span>Score:</span>
                        <span class="${weightedClass}">${Math.round(weighted)}</span>
                    </div>
                    ${games ? `<div class="factor-games">${games} games</div>` : ''}
                </div>
            </div>
        `;
        };

        // Win rates
        if (factors.overallWinRate) {
            sections.push(await formatFactor(
                'Overall Win Rate',
                Math.round(factors.overallWinRate.raw),
                factors.overallWinRate.weighted,
                factors.overallWinRate.games
            ));
        }

        if (factors.recentWinRate) {
            sections.push(await formatFactor(
                'Recent Win Rate',
                Math.round(factors.recentWinRate.raw),
                factors.recentWinRate.weighted,
                factors.recentWinRate.games
            ));
        }

        // Accuracy
        if (factors.accuracy) {
            const accuracyPercentage = factors.accuracy.gamesWithAccuracy === 0
                ? 0
                : Math.round((factors.accuracy.highAccuracyGames / factors.accuracy.gamesWithAccuracy) * 100);

            sections.push(await formatFactor(
                'High Accuracy Games',
                accuracyPercentage,
                factors.accuracy.weighted,
                `${factors.accuracy.highAccuracyGames}/${factors.accuracy.gamesWithAccuracy}`
            ));
        }

        // Final calculation
        if (factors.calculation) {
            const afterCapClass = await this.getRiskClass(factors.calculation.afterCap);
            sections.push(`
                <div class="calculation-section">
                    <div class="calculation-title">Final Calculation</div>
                    <div class="calculation-formula">
                        <div class="formula-item">
                            <span>Base Score</span>
                            <span>${Math.round(factors.calculation.weightedSum)}</span>
                        </div>
                        <div class="formula-item">
                            <span>Account Age Multiplier</span>
                            <span>×${factors.calculation.accountAgeFactor}</span>
                        </div>
                        <div class="formula-result ${afterCapClass}">
                            <span>Final Score</span>
                            <span>${Math.round(factors.calculation.afterCap)}</span>
                        </div>
                    </div>
                </div>
            `);
        }

        // Add Other Formats section if available
        if (otherFormats?.length > 0) {
            const otherFormat = otherFormats[0];  // The format with lower score
            const score = Math.round(otherFormat.score);
            console.debug('[RiskDisplay] Adding other format section:', otherFormat.format, 'with score:', score);

            const scoreClass = await this.getRiskClass(score);
            sections.push(`
                <div class="other-formats-section">
                    <div class="calculation-title">Other Formats</div>
                    <div class="calculation-formula">
                        <div class="formula-item">
                            <span>${otherFormat.format.replace('chess_', '')}</span>
                            <span class="${scoreClass}">${score}%</span>
                        </div>
                        <div class="formula-result ${scoreClass}">
                            <span>${this.getRiskLevelText(score)}</span>
                        </div>
                    </div>
                </div>
            `);
        } else {
            console.debug('[RiskDisplay] No other formats available');
        }

        this.factors.innerHTML = sections.join('');

        // Attach event listeners to action buttons
        this.attachActionButtons();
    }

    /**
     * Attach event listeners to action buttons
     */
    attachActionButtons() {
        // Abort button
        const abortBtn = document.getElementById('abort-game-btn');
        if (abortBtn) {
            abortBtn.addEventListener('click', () => {
                this.abortGame();
            });
        }

        // Report button
        const reportBtn = document.getElementById('report-user-btn');
        if (reportBtn && this.lastValidScore) {
            reportBtn.addEventListener('click', async () => {
                await this.reportUser(this.lastValidScore);
            });
        }
    }

    /**
     * Abort the current game
     */
    abortGame() {
        const confirmed = confirm(
            '⛔ Abort this game?\n\n' +
            'This will count toward your abort limit.\n\n' +
            'Note: You can only abort games with less than 2 moves.'
        );

        if (confirmed) {
            // Inform user to use Chess.com's abort button
            alert(
                '📌 To abort the game:\n\n' +
                '1. Go to the Chess.com game tab\n' +
                '2. Click the "Abort" button on the game board\n' +
                '3. The abort will be tracked automatically\n\n' +
                'This extension cannot abort games directly for security reasons.'
            );
        }
    }

    /**
     * Report user to the tracking system
     */
    async reportUser(riskData) {
        try {
            const reportBtn = document.getElementById('report-user-btn');
            if (reportBtn) {
                reportBtn.disabled = true;
                reportBtn.textContent = '⏳ Reporting...';
            }

            const report = {
                username: riskData.opponentUsername,
                riskScore: Math.round(riskData.maxScore.value || 0),
                gameId: 'unknown', // We don't have gameId in RiskDisplay
                reason: `High risk detected (${Math.round(riskData.maxScore.value)}%)`,
                playerStats: {
                    rating: riskData.maxScore.factors?.accuracy?.playerRating || null,
                    winRate: riskData.maxScore.factors?.overallWinRate?.raw || null,
                    accuracy: riskData.maxScore.factors?.accuracy?.raw || null
                }
            };

            const response = await chrome.runtime.sendMessage({
                action: 'addReport',
                report
            });

            if (response.success) {
                if (reportBtn) {
                    reportBtn.textContent = '✅ Reported';
                    setTimeout(() => {
                        reportBtn.textContent = '📋 Report User';
                        reportBtn.disabled = false;
                    }, 2000);
                }
            } else {
                throw new Error(response.error || 'Failed to add report');
            }
        } catch (error) {
            console.error('Failed to report user:', error);
            const reportBtn = document.getElementById('report-user-btn');
            if (reportBtn) {
                reportBtn.textContent = '❌ Failed';
                setTimeout(() => {
                    reportBtn.textContent = '📋 Report User';
                    reportBtn.disabled = false;
                }, 2000);
            }
        }
    }

    /**
     * Get risk level text
     */
    getRiskLevelText(score) {
        if (score <= 25) return 'Low Risk';
        if (score <= 50) return 'Medium Risk';
        if (score <= 75) return 'High Risk';
        return 'Critical Risk';
    }

    /**
     * Get risk level class based on custom thresholds
     */
    async getRiskClass(score) {
        const thresholds = await this.thresholdService.getThresholds();
        const { riskLevels } = thresholds;

        if (score < riskLevels.medium) return 'risk-low';
        if (score < riskLevels.high) return 'risk-medium';
        if (score < riskLevels.critical) return 'risk-high';
        return 'risk-critical';
    }

    /**
     * Show informational message
     */
    showInfo(title, message) {
        // Reset circle
        this.scoreCircle.setAttribute('stroke-dasharray', '0 283');
        this.scoreCircle.setAttribute('class', 'score-progress');

        // Show info message
        this.scoreDisplay.innerHTML = `
            <div class="score-value" style="font-size: 18px;">ℹ️</div>
            <div class="score-label">${title}</div>
        `;

        // Show message in factors area
        this.factors.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
                ${message}
            </div>
        `;

        this.lastValidScore = null;
    }

    clearDisplay() {
        // Reset circle
        this.scoreCircle.setAttribute('stroke-dasharray', '0 283');
        this.scoreCircle.setAttribute('class', 'score-progress');

        // Reset score display
        this.scoreDisplay.innerHTML = `
            <div class="score-value">...</div>
            <div class="score-label">Waiting for game</div>
        `;

        // Clear factors
        this.factors.innerHTML = '';

        // Clear stored score
        this.lastValidScore = null;
    }
}
