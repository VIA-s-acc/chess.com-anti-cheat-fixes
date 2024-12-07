```markdown
# Updated Risk Score Model

This document provides an updated risk score model to be implemented **alongside the original one**. The model aims to improve the detection of potential cheaters on chess.com by adjusting weights and scoring functions based on observed data.

---

## Overview

We will calculate several metrics based on the player's data and combine them into a final risk score \( R \). The metrics include:

1. **Account Age Score (\( S_A \))**
2. **Overall Win Rate Score (\( S_{W_{\text{overall}_f}} \))**
3. **Recent Win Rate Score (\( S_{W_{\text{recent}_f}} \))**
4. **High Accuracy Games Score (\( S_{H_f} \))**

**Note**: The **Win Rate Difference Score** has been de-emphasized due to its lesser impact in previous tests.

---

## Parameters and Thresholds

- **Account Age Threshold**: 2 months
- **Win Rate Thresholds**:
  - Baseline win rate: 50%
  - Suspicious win rate: Above 55%
  - Critical win rate: Above 70%
- **High Accuracy Thresholds**:
  - For ratings below 1500: Accuracy ≥ 80%
  - For any rating: Accuracy ≥ 90%
- **Weighting Function Parameter**:
  - \( k = 5 \) (reduced from 20)

---

## Weight Assignments for Sub-Scores

- \( w_1 = 0.1 \): Account Age Score Weight
- \( w_2 = 0.3 \): Overall Win Rate Score Weight
- \( w_3 = 0.3 \): Recent Win Rate Score Weight
- \( w_4 = 0.3 \): High Accuracy Games Score Weight

**Total Weight**: 1

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
    \left( \frac{W_{\text{overall}_f} - 0.5}{0.2} \right) \times 100, & \text{if } 0.5 < W_{\text{overall}_f} \leq 0.7 \\
    100 + \left( \frac{W_{\text{overall}_f} - 0.7}{0.1} \right) \times 100, & \text{if } W_{\text{overall}_f} > 0.7
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

**Explanation**: The win rate score increases more sharply for win rates above 70%, emphasizing exceptionally high win rates. The weighting function adjusts the score based on the number of games played.

---

### 3. Recent Win Rate Score (\( S_{W_{\text{recent}_f}} \))

**Purpose**: A high recent win rate may indicate recent changes in behavior.

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
    \left( \frac{W_{\text{recent}_f} - 0.5}{0.2} \right) \times 100, & \text{if } 0.5 < W_{\text{recent}_f} \leq 0.7 \\
    100 + \left( \frac{W_{\text{recent}_f} - 0.7}{0.1} \right) \times 100, & \text{if } W_{\text{recent}_f} > 0.7
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

**Explanation**: Similar to the overall win rate score, but focuses on recent performance.

---

### 4. High Accuracy Games Score (\( S_{H_f} \))

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

- **Adjusted High Accuracy Score**:

  \[
  \text{Adjusted Accuracy Score} = \min( H_f \times 1.5, 100 )
  \]

- **Weighting Function**:

  \[
  w(n_{\text{accuracy}_f}) = \frac{n_{\text{accuracy}_f}}{n_{\text{accuracy}_f} + k}
  \]

- **Weighted High Accuracy Games Score**:

  \[
  S_{H_f} = w(n_{\text{accuracy}_f}) \times \text{Adjusted Accuracy Score}
  \]

**Explanation**: The high accuracy score is increased by multiplying by 1.5, emphasizing the importance of high accuracy games, but capped at 100.

---

### 5. Final Risk Score (\( R \))

**Purpose**: Combine all the sub-scores into a single risk score.

**Calculation**:

\[
R_f = (w_2 \times S_{W_{\text{overall}_f}} + w_3 \times S_{W_{\text{recent}_f}} + w_4 \times S_{H_f}) + (w_1 \times S_A \times 100)
\]

**Explanation**:

- The account age score is added to the total risk score, rather than multiplying.
- This ensures that older accounts with high-risk indicators are still assigned appropriate risk scores.

- **Aggregating Scores Across Formats**:

  If analyzing multiple formats, compute the overall risk score \( R \) as the average of \( R_f \) across all formats considered:

  \[
  R = \frac{1}{N} \sum_{f} R_f
  \]

  where \( N \) is the number of formats included.

---

## Implementation Notes

- **Parallel Implementation**: This updated model should be implemented **alongside the original model**, allowing for comparison and further adjustments based on empirical data.

- **Adjustable Parameters**:

  - The parameter \( k \) can be fine-tuned based on validation.
  - The weights \( w_i \) can be adjusted in the configuration file to optimize performance.

---

## Logical Justifications

- **Emphasizing High Win Rates**: The revised win rate scoring function increases sensitivity to exceptionally high win rates, which are strong indicators of potential cheating.

- **Adjusting for Sample Size**: Reducing \( k \) in the weighting function gives more weight to smaller sample sizes, ensuring that high win rates over fewer games are appropriately reflected in the risk score.

- **Enhancing High Accuracy Impact**: Increasing the high accuracy games score (by multiplying by 1.5) emphasizes the significance of consistently high accuracy in games, without overemphasizing it.

- **Account Age as Additive**: By adding the account age score rather than multiplying, we prevent the account age from nullifying other risk indicators.

- **De-emphasizing Win Rate Difference**: Based on observations, the win rate difference between recent and overall games has less impact on detecting cheaters and is therefore excluded from the updated model.

---

## Notes and Recommendations

- **Validation and Calibration**: It's essential to validate this updated model against known cases to ensure its effectiveness and make further adjustments as necessary.

- **Handling Missing Data**: If certain data is unavailable (e.g., no accuracy data), the corresponding sub-score can be set to zero, and weights may need to be adjusted proportionally.

- **Edge Cases**: Be cautious with players who have very few games; while the reduced \( k \) value increases their impact, statistical significance may still be low.

---

## Conclusion

This updated risk score model aims to improve the detection of potential cheaters by adjusting weights and scoring functions based on practical observations. Implementing this model alongside the original one allows for comparison and further refinement to achieve optimal performance in identifying cheating behavior.

---
```