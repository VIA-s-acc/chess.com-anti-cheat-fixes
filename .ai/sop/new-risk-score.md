# Updated Risk Score Calculation Instructions

This document provides an updated guide for calculating a risk score (from 0 to 100) that indicates the likelihood of a chess.com player engaging in cheating. The calculation is based on various player statistics and incorporates adjustments to address previous issues.

---

## Overview

We will calculate several metrics based on the player's data and combine them into a final risk score \( R \). The metrics include:

1. **Overall Win Rate Score (\( S_{W_{\text{overall}_f}} \))**
2. **Recent Win Rate Score (\( S_{W_{\text{recent}_f}} \))**
3. **High Accuracy Games Score (\( S_{H_f} \))**
4. **Account Age Factor (\( F_A \))**

**Note:** The **Win Rate Difference Score** is omitted due to its lesser impact.

---

## Parameters and Thresholds

- **Win Rate Thresholds:**
  - Baseline win rate: 50%
  - Suspicious win rate: Above 55%
  - High-risk win rate: Above 70%
- **High Accuracy Thresholds:**
  - For ratings below 1500: Accuracy ≥ 80%
  - For any rating: Accuracy ≥ 90%
- **Weighting Function Parameter:**
  - \( k = 20 \) (adjustable)
- **Account Age Threshold:**
  - Accounts newer than 2 months receive an account age factor.

---

## Weights for Sub-Scores

- \( w_1 = 0.35 \): Overall Win Rate Score Weight
- \( w_2 = 0.35 \): Recent Win Rate Score Weight
- \( w_3 = 0.30 \): High Accuracy Games Score Weight

**Total Weight:** 1.0

**Note:** The weights sum to 1, ensuring the final risk score is normalized.

---

## Calculations

### 1. Overall Win Rate Score (\( S_{W_{\text{overall}_f}} \))

**Purpose:** A high overall win rate, especially over many games, may indicate abnormal performance.

**Calculations:**

- **Total Games in Format \( f \):**

  \[
  n_{\text{overall}_f} = \text{Wins}_{\text{total}_f} + \text{Draws}_{\text{total}_f} + \text{Losses}_{\text{total}_f}
  \]

- **Overall Win Rate:**

  \[
  W_{\text{overall}_f} = \frac{\text{Wins}_{\text{total}_f}}{n_{\text{overall}_f}}
  \]

- **Win Rate Score Before Weighting:**

  \[
  \text{Win Rate Score} = \begin{cases}
    0, & \text{if } W_{\text{overall}_f} \leq 0.5 \\
    \left( \frac{W_{\text{overall}_f} - 0.5}{0.1} \right) \times 50, & \text{if } 0.5 < W_{\text{overall}_f} \leq 0.6 \\
    50 + \left( \frac{W_{\text{overall}_f} - 0.6}{0.1} \right) \times 50, & \text{if } 0.6 < W_{\text{overall}_f} \leq 0.7 \\
    100 + \left( \frac{W_{\text{overall}_f} - 0.7}{0.05} \right) \times 100, & \text{if } W_{\text{overall}_f} > 0.7
  \end{cases}
  \]

  **Explanation:**

  - **50%–60% Win Rate:** Linear scaling from 0 to 50.
  - **60%–70% Win Rate:** Linear scaling from 50 to 100.
  - **Above 70% Win Rate:** Exponential scaling, with the score increasing more sharply.

- **Weighting Function:**

  \[
  w(n_{\text{overall}_f}) = \frac{n_{\text{overall}_f}}{n_{\text{overall}_f} + k}
  \]

- **Weighted Overall Win Rate Score:**

  \[
  S_{W_{\text{overall}_f}} = w(n_{\text{overall}_f}) \times \text{Win Rate Score}
  \]

---

### 2. Recent Win Rate Score (\( S_{W_{\text{recent}_f}} \))

**Purpose:** A high recent win rate may indicate recent changes in behavior.

**Calculations:**

- **Total Recent Games in Format \( f \):**

  \[
  n_{\text{recent}_f} = \text{Wins}_{\text{recent}_f} + \text{Draws}_{\text{recent}_f} + \text{Losses}_{\text{recent}_f}
  \]

- **Recent Win Rate:**

  \[
  W_{\text{recent}_f} = \frac{\text{Wins}_{\text{recent}_f}}{n_{\text{recent}_f}}
  \]

- **Win Rate Score Before Weighting:**

  Use the same scoring function as for the overall win rate.

- **Weighting Function:**

  \[
  w(n_{\text{recent}_f}) = \frac{n_{\text{recent}_f}}{n_{\text{recent}_f} + k}
  \]

- **Weighted Recent Win Rate Score:**

  \[
  S_{W_{\text{recent}_f}} = w(n_{\text{recent}_f}) \times \text{Win Rate Score}
  \]

---

### 3. High Accuracy Games Score (\( S_{H_f} \))

**Purpose:** A high percentage of games with unusually high accuracy may indicate the use of external assistance.

**Calculations:**

- **High Accuracy Criteria:**
  - For players with ratings below 1500: Accuracy ≥ 80%
  - For players of any rating: Accuracy ≥ 90%

- **Number of High Accuracy Games:**

  Count of recent games meeting the high accuracy criteria.

- **Total Games with Known Accuracy:**

  Number of recent games where accuracy data is available.

- **Percentage of High Accuracy Games:**

  \[
  H_f = \left( \frac{\text{Number of High Accuracy Games}_f}{\text{Number of Games with Known Accuracy}_f} \right) \times 100\%
  \]

- **Adjusted High Accuracy Score:**

  \[
  \text{Adjusted Accuracy Score} = H_f \times 1.5
  \]

  **Note:** Do not cap the score here; allow it to exceed 100 if applicable.

- **Weighting Function:**

  \[
  w(n_{\text{accuracy}_f}) = \frac{n_{\text{accuracy}_f}}{n_{\text{accuracy}_f} + k}
  \]

- **Weighted High Accuracy Games Score:**

  \[
  S_{H_f} = w(n_{\text{accuracy}_f}) \times \text{Adjusted Accuracy Score}
  \]

---

### 4. Account Age Factor (\( F_A \))

**Purpose:** New accounts are more suspicious when combined with other negative indicators.

**Calculation:**

Let:

- \( A \) = Account age in months

Then:

\[
F_A = \begin{cases}
C, & \text{if } A \leq 2 \\
1, & \text{if } A > 2
\end{cases}
\]

- **\( C \)** is a multiplier greater than 1 (e.g., \( C = 1.5 \)) to amplify the risk score for new accounts.

---

### 5. Final Risk Score (\( R \))

**Purpose:** Combine all the sub-scores into a single risk score.

**Calculation:**

- **Weighted Sum of Sub-Scores:**

  \[
  S_{\text{total}} = w_1 \times S_{W_{\text{overall}_f}} + w_2 \times S_{W_{\text{recent}_f}} + w_3 \times S_{H_f}
  \]

- **Apply Account Age Factor:**

  \[
  R_f = \min\left( F_A \times \left( \frac{S_{\text{total}}}{\text{Total Weights}} \right), 100 \right)
  \]

  **Explanation:**

  - Multiply the weighted sum by the account age factor \( F_A \).
  - Normalize by dividing by the total weights (which is 1.0).
  - Use the `min` function to cap the final risk score at 100.

- **Aggregating Scores Across Formats:**

  If analyzing multiple formats, compute the overall risk score \( R \) as the average of \( R_f \) across all formats considered:

  \[
  R = \frac{1}{N} \sum_{f} R_f
  \]

  where \( N \) is the number of formats included.

---

## Implementation Steps

1. **Collect Data:**

   - Gather all necessary player data, including total and recent game statistics and accuracy data.
   - Separate data by game format (e.g., 'blitz', 'rapid').

2. **Calculate Sub-Scores:**

   - For each format \( f \), compute \( S_{W_{\text{overall}_f}} \), \( S_{W_{\text{recent}_f}} \), and \( S_{H_f} \) using the formulas provided.

3. **Determine Account Age Factor (\( F_A \)):**

   - Calculate the account age \( A \) in months.
   - Apply the account age factor based on the threshold.

4. **Compute Final Risk Score for Each Format (\( R_f \)):**

   - Calculate the weighted sum \( S_{\text{total}} \).
   - Apply the account age factor and normalize.
   - Cap the final risk score at 100.

5. **Aggregate Scores Across Formats:**

   - If applicable, average the risk scores across formats.

6. **Interpret the Risk Score:**

   - The final risk score \( R \) ranges from 0 to 100.
   - Higher scores indicate a higher likelihood of cheating.

---

## Example Calculation

Assume a player has the following data for the 'rapid' format:

- **Account Age:** 1.5 months (new account)
- **Total Games:** 100
  - Wins: 80
  - Draws: 10
  - Losses: 10
- **Recent Games:** 20
  - Wins: 18
  - Draws: 1
  - Losses: 1
- **High Accuracy Games:**
  - Number with High Accuracy: 15
  - Total with Known Accuracy: 18
- **Account Age Factor:** \( F_A = 1.5 \)

**Calculations:**

1. **Overall Win Rate Score:**

   - \( W_{\text{overall}} = 80\% \)
   - Since \( W_{\text{overall}} > 70\% \):

     \[
     \text{Win Rate Score} = 100 + \left( \frac{W_{\text{overall}} - 0.7}{0.05} \times 100 \right) = 100 + \left( \frac{0.8 - 0.7}{0.05} \times 100 \right) = 100 + 200 = 300
     \]

   - **Weighting:**

     - \( w(n_{\text{overall}}) = \frac{100}{100 + 20} = \frac{100}{120} = 0.8333 \)
     - \( S_{W_{\text{overall}}} = 0.8333 \times 300 = 250 \)

2. **Recent Win Rate Score:**

   - \( W_{\text{recent}} = 90\% \)
   - Since \( W_{\text{recent}} > 70\% \):

     \[
     \text{Win Rate Score} = 100 + \left( \frac{0.9 - 0.7}{0.05} \times 100 \right) = 100 + 400 = 500
     \]

   - **Weighting:**

     - \( w(n_{\text{recent}}) = \frac{20}{20 + 20} = 0.5 \)
     - \( S_{W_{\text{recent}}} = 0.5 \times 500 = 250 \)

3. **High Accuracy Games Score:**

   - \( H_f = \left( \frac{15}{18} \right) \times 100\% \approx 83.33\% \)
   - \( \text{Adjusted Accuracy Score} = 83.33 \times 1.5 \approx 125 \)
   - **Weighting:**

     - \( w(n_{\text{accuracy}}) = \frac{18}{18 + 20} = \frac{18}{38} \approx 0.4737 \)
     - \( S_{H_f} = 0.4737 \times 125 \approx 59.21 \)

4. **Weighted Sum of Sub-Scores:**

   - \( S_{\text{total}} = 0.35 \times 250 + 0.35 \times 250 + 0.30 \times 59.21 = 87.5 + 87.5 + 17.76 = 192.76 \)

5. **Final Risk Score:**

   - Apply the account age factor:

     \[
     R_f = \min\left( 1.5 \times 192.76, 100 \right) = \min(289.14, 100) = 100
     \]

   - **Explanation:** The raw score exceeds 100, so it is capped at 100.

---

## Notes and Recommendations

- **Adjustable Parameters:**
  - The parameter \( k \) and the account age multiplier \( C \) can be fine-tuned based on validation.
  - Weights \( w_i \) can be adjusted to reflect the importance of each metric.

- **Non-linear Scaling for High Win Rates:**
  - The win rate scoring function includes exponential scaling for win rates above 70%, reflecting the rarity and suspicion associated with such high win rates.

- **Capping Only the Final Risk Score:**
  - Individual sub-scores are not capped, allowing exceptional values to influence the final risk score significantly.
  - The final risk score is capped at 100 to maintain the intended scale.

- **Handling Missing Data:**
  - If certain data is unavailable (e.g., no accuracy data), set the corresponding sub-score to zero.
  - Adjust weights proportionally if necessary.

- **Validation and Calibration:**
  - Test the model with known data to ensure accuracy.
  - Adjust parameters based on empirical results.

---

## Conclusion

This updated risk score model incorporates the necessary adjustments to provide a balanced and accurate assessment of potential cheating behavior. By emphasizing exceptionally high win rates and accounting for account age as a multiplier, the model aligns with the observed likelihood of cheating.

Implement this model carefully, ensuring all calculations are performed accurately, and consider validating the model with real-world data for optimal performance.

---

**Please note:** This instruction is intended to replace the previous model, incorporating all the changes discussed. Ensure that all team members are informed of the updates and understand the new calculation methods.

---

## Implementation Status and Updates

### Configuration Updates ✅
- All thresholds and parameters moved to `config.js`
- Organized into specific sections:
  - `WINRATE_THRESHOLDS`
  - `HIGH_ACCURACY_THRESHOLDS`
  - `ACCURACY_THRESHOLDS`
  - `WEIGHTS`
  - `THRESHOLDS`

### Performance Optimizations ✅
1. **Weight Calculations**
   - Added caching mechanism for weight calculations
   - Prevents redundant calculations for same sample sizes
   - Maintains cache throughout extension lifecycle

2. **Score Calculations**
   - Added early exits for efficiency
   - Pre-calculated common values
   - Simplified mathematical operations
   - Used integer operations where appropriate

### Implementation Notes
- All calculations follow the exact formulas specified in this document
- Added debug output for verification
- Maintained original logic while improving performance
- Configuration-driven approach allows easy adjustments

### Validation
- Unit tests verify correct implementation
- Debug output matches mathematical model
- Edge cases handled appropriately
- Score capping works as specified

### Current Status
- ✅ All formulas implemented exactly as documented
- ✅ All thresholds configurable through `config.js`
- ✅ Performance optimizations added
- ✅ Comprehensive debug output available

