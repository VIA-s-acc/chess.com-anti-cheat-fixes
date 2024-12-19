import { SETTINGS } from '../../config.js';
import SettingsManager from '../options/SettingsManager.js';

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
            header.textContent = `Risk Score: ${riskData.opponentUsername || 'Unknown'}`;
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
        const colorClass = this.getRiskClass(score);

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
            this.updateFactors(maxScore.factors, otherFormats);
        } else {
            console.debug('[RiskDisplay] No factors to update');
        }
    }

    /**
     * Update contributing factors section
     */
    updateFactors(factors, otherFormats) {
        const sections = [];

        // Helper for factor formatting
        const formatFactor = (title, raw, weighted, games = null) => `
            <div class="factor-item">
                <div class="factor-header">
                    <span>${title}</span>
                    <span class="${this.getRiskClass(weighted)}">${raw}%</span>
                </div>
                <div class="factor-details">
                    <div class="factor-score">
                        <span>Score:</span>
                        <span class="${this.getRiskClass(weighted)}">${Math.round(weighted)}</span>
                    </div>
                    ${games ? `<div class="factor-games">${games} games</div>` : ''}
                </div>
            </div>
        `;

        // Win rates
        if (factors.overallWinRate) {
            sections.push(formatFactor(
                'Overall Win Rate',
                Math.round(factors.overallWinRate.raw),
                factors.overallWinRate.weighted,
                factors.overallWinRate.games
            ));
        }

        if (factors.recentWinRate) {
            sections.push(formatFactor(
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
            
            sections.push(formatFactor(
                'High Accuracy Games',
                accuracyPercentage,
                factors.accuracy.weighted,
                `${factors.accuracy.highAccuracyGames}/${factors.accuracy.gamesWithAccuracy}`
            ));
        }

        // Final calculation
        if (factors.calculation) {
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
                        <div class="formula-result ${this.getRiskClass(factors.calculation.afterCap)}">
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

            sections.push(`
                <div class="other-formats-section">
                    <div class="calculation-title">Other Formats</div>
                    <div class="calculation-formula">
                        <div class="formula-item">
                            <span>${otherFormat.format.replace('chess_', '')}</span>
                            <span class="${this.getRiskClass(score)}">${score}%</span>
                        </div>
                        <div class="formula-result ${this.getRiskClass(score)}">
                            <span>${this.getRiskLevelText(score)}</span>
                        </div>
                    </div>
                </div>
            `);
        } else {
            console.debug('[RiskDisplay] No other formats available');
        }

        this.factors.innerHTML = sections.join('');
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
     * Get risk level class
     */
    getRiskClass(score) {
        if (score <= 25) return 'risk-low';
        if (score <= 50) return 'risk-medium';
        if (score <= 75) return 'risk-high';
        return 'risk-critical';
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