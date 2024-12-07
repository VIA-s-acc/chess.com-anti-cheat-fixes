```markdown
# Risk Score Calculation Instructions

This document provides a detailed guide for calculating a risk score (from 0 to 100) that indicates the likelihood of a chess.com player engaging in cheating. The calculation is based on various player statistics and incorporates statistical adjustments to ensure accuracy and reliability.

---

## Overview

We will calculate several metrics based on the player's data and combine them into a final risk score \( R \). The metrics include:

1. **Account Age Score (\( S_A \))**
2. **Overall Win Rate Score (\( S_{W_{\text{overall}_f}} \))**
3. **Recent Win Rate Score (\( S_{W_{\text{recent}_f}} \))**
4. **Win Rate Difference Score (\( S_{\Delta W_f} \))**
5. **High Accuracy Games Score (\( S_{H_f} \))**

These metrics are calculated for each relevant game format \( f \in \{\text{blitz}, \text{rapid}\} \), excluding 'bullet' due to its fast-paced nature.

---

## Parameters and Thresholds

The Thresholds should be stored in a separate config file, preferably to be easily edited by the end user later

- **Account Age Threshold**: 2 months
- **Win Rate Thresholds**:
  - Baseline win rate: 50%
  - Suspicious win rate: Above 55%
  - Critical win rate: Above 60%
- **Win Rate Difference Threshold**: 10% (0.1)
- **High Accuracy Thresholds**:
  - For ratings below 1500: Accuracy ≥ 80%
  - For any rating: Accuracy ≥ 90%
- **Weighting Function Parameter**:
  - \( k = 20 \) (adjustable)

---

## Weight Assignments for Sub-Scores

The Weights should be stored in the same config file as threshholds


- \( w_1 = 0.1 \): Account Age Score Weight
- \( w_2 = 0.225 \): Overall Win Rate Score Weight
- \( w_3 = 0.225 \): Recent Win Rate Score Weight
- \( w_4 = 0.225 \): Win Rate Difference Score Weight
- \( w_5 = 0.225 \): High Accuracy Games Score Weight

**Note**: The weights have been adjusted to sum to 1 after excluding the time per move parameter.

---

## Calculations

### 1. Account Age Score (\( S_A \))

**Purpose**: New accounts are more suspicious when combined with other negative indicators.

**Calculation**:

Let:

- \( A \) = Account age in months

Then:

\[
S_A = \begin{cases}
1, & \text{if } A \leq 2 \\
0, & \text{if } A > 2
\end{cases}
\]

**Explanation**: If the account is 2 months old or newer, \( S_A \) is set to 1, indicating a potential risk factor. Otherwise, \( S_A \) is 0.

---

### 2. Overall Win Rate Score (\( S_{W_{\text{overall}_f}} \))

**Purpose**: A high overall win rate, especially over many games, may indicate abnormal performance.

**Calculations**:

- **Total Games in Format \( f \)**:

  \[
  n_{\text{overall}_f} = \text{Wins}_{\text{total}_f} + \text{Draws}_{\text{total}_f} + \text{Losses}_{\text{total}_f}
  \]

- **Overall Win Rate**:

  \[
  W_{\text{overall}_f} = \frac{\text{Wins}_{\text{total}_f}}{n_{\text{overall}_f}}
  \]

- **Win Rate Score Before Weighting**:

  \[
  \text{Win Rate Score} = \begin{cases}
    0, & \text{if } W_{\text{overall}_f} \leq 0.5 \\
    \left( \frac{W_{\text{overall}_f} - 0.5}{0.1} \right) \times 100, & \text{if } 0.5 < W_{\text{overall}_f} \leq 0.6 \\
    100, & \text{if } W_{\text{overall}_f} > 0.6
  \end{cases}
  \]

- **Weighting Function**:

  \[
  w(n_{\text{overall}_f}) = \frac{n_{\text{overall}_f}}{n_{\text{overall}_f} + k}
  \]

- **Weighted Overall Win Rate Score**:

  \[
  S_{W_{\text{overall}_f}} = w(n_{\text{overall}_f}) \times \text{Win Rate Score}
  \]

**Explanation**: The win rate score increases as the overall win rate exceeds 50%, capping at 100. The weighting function adjusts the score based on the number of games played, giving more weight to win rates calculated from larger sample sizes.

---

### 3. Recent Win Rate Score (\( S_{W_{\text{recent}_f}} \))

**Purpose**: A high recent win rate may indicate recent changes in behavior, such as the onset of cheating.

**Calculations**:

- **Total Recent Games in Format \( f \)**:

  \[
  n_{\text{recent}_f} = \text{Wins}_{\text{recent}_f} + \text{Draws}_{\text{recent}_f} + \text{Losses}_{\text{recent}_f}
  \]

- **Recent Win Rate**:

  \[
  W_{\text{recent}_f} = \frac{\text{Wins}_{\text{recent}_f}}{n_{\text{recent}_f}}
  \]

- **Win Rate Score Before Weighting**:

  \[
  \text{Win Rate Score} = \begin{cases}
    0, & \text{if } W_{\text{recent}_f} \leq 0.5 \\
    \left( \frac{W_{\text{recent}_f} - 0.5}{0.1} \right) \times 100, & \text{if } 0.5 < W_{\text{recent}_f} \leq 0.6 \\
    100, & \text{if } W_{\text{recent}_f} > 0.6
  \end{cases}
  \]

- **Weighting Function**:

  \[
  w(n_{\text{recent}_f}) = \frac{n_{\text{recent}_f}}{n_{\text{recent}_f} + k}
  \]

- **Weighted Recent Win Rate Score**:

  \[
  S_{W_{\text{recent}_f}} = w(n_{\text{recent}_f}) \times \text{Win Rate Score}
  \]

**Explanation**: Similar to the overall win rate score, but focuses on recent performance. The weighting accounts for the number of recent games.

---

### 4. Win Rate Difference Score (\( S_{\Delta W_f} \))

**Purpose**: A significant increase in recent win rate compared to the overall win rate may suggest a sudden change in performance, which could be suspicious.

**Calculations**:

- **Win Rate Difference**:

  \[
  \Delta W_f = W_{\text{recent}_f} - W_{\text{overall}_f}
  \]

- **Win Rate Difference Score Before Weighting**:

  \[
  \text{Win Rate Difference Score} = \begin{cases}
    0, & \text{if } \Delta W_f \leq 0 \\
    \left( \frac{\Delta W_f}{0.1} \right) \times 100, & \text{if } 0 < \Delta W_f \leq 0.1 \\
    100, & \text{if } \Delta W_f > 0.1
  \end{cases}
  \]

- **Combined Weight for Difference**:

  \[
  w_{\Delta}(n_{\text{overall}_f}, n_{\text{recent}_f}) = \frac{2}{\frac{1}{w(n_{\text{overall}_f})} + \frac{1}{w(n_{\text{recent}_f})}}
  \]

- **Weighted Win Rate Difference Score**:

  \[
  S_{\Delta W_f} = w_{\Delta}(n_{\text{overall}_f}, n_{\text{recent}_f}) \times \text{Win Rate Difference Score}
  \]

**Explanation**: The win rate difference score highlights significant improvements in recent performance. The combined weight considers both the overall and recent number of games, ensuring that the score reflects the reliability of the data.

---

### 5. High Accuracy Games Score (\( S_{H_f} \))

**Purpose**: A high percentage of games with unusually high accuracy may indicate the use of external assistance.

**Calculations**:

- **High Accuracy Criteria**:
  - For players with ratings below 1500: Accuracy ≥ 80%
  - For players of any rating: Accuracy ≥ 90%

- **Number of High Accuracy Games**: Count of recent games meeting the high accuracy criteria.

- **Total Games with Known Accuracy**: Number of recent games where accuracy data is available.

- **Percentage of High Accuracy Games**:

  \[
  H_f = \left( \frac{\text{Number of High Accuracy Games}_f}{\text{Number of Games with Known Accuracy}_f} \right) \times 100\%
  \]

- **Weighting Function**:

  \[
  w(n_{\text{accuracy}_f}) = \frac{n_{\text{accuracy}_f}}{n_{\text{accuracy}_f} + k}
  \]

- **Weighted High Accuracy Games Score**:

  \[
  S_{H_f} = w(n_{\text{accuracy}_f}) \times H_f
  \]

**Explanation**: The score reflects the proportion of high accuracy games, weighted by the number of games with known accuracy to account for sample size.

---

### 6. Final Risk Score (\( R \))

**Purpose**: Combine all the sub-scores into a single risk score.

**Calculation**:

\[
R_f = S_A \times \left( w_2 \times S_{W_{\text{overall}_f}} + w_3 \times S_{W_{\text{recent}_f}} + w_4 \times S_{\Delta W_f} + w_5 \times S_{H_f} \right)
\]

- \( R_f \): Risk score for format \( f \)

- **Aggregating Scores Across Formats**:

  If analyzing multiple formats, compute the overall risk score \( R \) as the average of \( R_f \) across all formats considered:

  \[
  R = \frac{1}{N} \sum_{f} R_f
  \]

  where \( N \) is the number of formats included.

**Explanation**: The final risk score is a weighted sum of the sub-scores, adjusted by the account age score \( S_A \). This structure ensures that all factors contribute appropriately to the overall assessment.

---

## Logical Justifications

- **Weighting by Sample Size**: Using the weighting function \( w(n) = \frac{n}{n + k} \) adjusts scores based on the number of observations, reflecting the confidence in the data. Larger sample sizes yield weights closer to 1, indicating higher reliability.

- **Threshold-Based Scoring**: Implementing thresholds for win rates and other metrics allows us to identify values that are statistically unusual or indicative of potential cheating.

- **Multiplicative Account Age Factor**: Multiplying the combined score by \( S_A \) emphasizes the increased risk associated with new accounts when other indicators are present.

---

## Implementation Steps

1. **Collect Data**: Gather all necessary player data, including total and recent game statistics and accuracy data.

2. **Calculate Sub-Scores**:

   - For each format \( f \), compute \( S_{W_{\text{overall}_f}} \), \( S_{W_{\text{recent}_f}} \), \( S_{\Delta W_f} \), and \( S_{H_f} \).

3. **Calculate Account Age Score**:

   - Determine the account age \( A \) and compute \( S_A \).

4. **Compute Final Risk Score**:

   - Use the formula for \( R_f \) to calculate the risk score for each format.
   - Aggregate the scores across formats if necessary.

5. **Interpret the Risk Score**:

   - The final risk score \( R \) ranges from 0 to 100.
   - Higher scores indicate a higher likelihood of cheating.

---

## Notes and Recommendations

- **Adjustable Parameters**: Parameters like \( k \) and weights \( w_i \) should be fine-tuned based on empirical data and validation against known cases.

- **Handling Missing Data**: If certain data is unavailable (e.g., no accuracy data), the corresponding sub-score can be set to zero or omitted from the final calculation, adjusting weights accordingly.

- **Validation and Calibration**: It's crucial to test the model with real data to ensure its effectiveness and adjust parameters as necessary.

- **Edge Cases**: Be cautious when interpreting results for players with very few games, as the statistical significance is lower.

---

## Conclusion

This risk score model provides a structured and quantitative approach to assessing the likelihood of a player engaging in cheating behavior based on observable data. By combining multiple indicators and adjusting for statistical reliability, the model aims to deliver accurate and meaningful risk assessments.

---
```