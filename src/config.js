/**
 * Chess.com API result mappings and constants
 */

export const GAME_RESULTS = {
    // Wins
    'win': 'win',
    
    // Draws
    'agreed': 'draw',
    'repetition': 'draw',
    'stalemate': 'draw',
    'insufficient': 'draw',
    '50move': 'draw',
    
    // Losses
    'checkmated': 'loss',
    'timeout': 'loss',
    'resigned': 'loss',
    'lose': 'loss',
    'abandoned': 'loss'
};

export const GAME_FORMATS = ['chess_rapid', 'chess_bullet', 'chess_blitz'];

export const ACCURACY_THRESHOLDS = {
    LOW_RATING: {
        threshold: 1500,
        requiredAccuracy: 80
    },
    HIGH_RATING: {
        threshold: 1500,
        requiredAccuracy: 90
    }
};

export const WEIGHTS = {
    OVERALL_WINRATE: 0.35,
    RECENT_WINRATE: 0.35,
    HIGH_ACCURACY: 0.30
};

export const THRESHOLDS = {
    ACCOUNT_AGE_DAYS: 60,
    WINRATE: {
        BASELINE: 50,
        SUSPICIOUS: 55,
        HIGH_RISK: 70
    },
    WEIGHTING_K: 20,
    MIN_GAMES: 5,
    ACCOUNT_AGE_MULTIPLIER: 1.5
};

export const WINRATE_THRESHOLDS = {
    LOW_WINRATE_THRESHOLD: 0.5,      // 50%
    MEDIUM_WINRATE_THRESHOLD: 0.6,   // 60%
    HIGH_WINRATE_THRESHOLD: 0.7,     // 70%
    HIGH_WINRATE_MULTIPLIER: 2,      // Multiplier for rates above 70%
    MEDIUM_WINRATE_MULTIPLIER: 1,    // Multiplier for rates 60-70%
    BASE_SCORE: 50,                  // Base score for scaling
    EXTENDED_SCORE: 100,             // Extended score for high win rates
    SCALE_FACTOR: 0.1,                // Scale factor for score calculations
    SIGNIFICANT_DIFF: 0.15,        // 15% difference is significant
    MAX_SCORE: 100,               // Maximum score for win rate difference
    COMBINED_WEIGHT_FACTOR: 2,    // Factor for combined weight calculation
};

export const HIGH_ACCURACY_THRESHOLDS = {
    MODERATE_SUSPICION_THRESHOLD: 10,   // Start scaling from 10%
    HIGH_SUSPICION_THRESHOLD: 20,       // 20-30% is highly suspicious
    EXTREME_SUSPICION_THRESHOLD: 30,    // Above 30% is extremely suspicious
    SUSPICION_SCALE_FACTOR: 1.5,        // Multiplier for suspicious accuracy
    
    // Score scaling parameters
    MODERATE_MAX_SCORE: 50,             // Max score for moderate (10-20%)
    HIGH_MAX_SCORE: 100,                // Max score for high (20-30%)
    EXTREME_SCORE_INCREMENT: 50,        // Score increment per 5% above 30%
    EXTREME_SCORE_STEP: 5               // Step size for extreme score calculation
};

export const SETTINGS = {
    RATED_ONLY: true,  // When true, only consider rated games for risk score
    AUTO_OPEN_POPUP: true  // When true, automatically open popup when opponent is detected
}; 