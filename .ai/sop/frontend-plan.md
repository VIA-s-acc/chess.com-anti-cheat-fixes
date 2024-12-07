# Frontend Development SOP for Chess.com Risk Score Chrome Extension

## Current Status

### Completed
- ✅ Core functionality implementation
- ✅ UI components design
- ✅ Message handling system
- ✅ Debug service
- ✅ Risk score calculation with max format score

### In Progress
- 🔄 Build system setup
- 🔄 Basic testing implementation

## Build System Decision
After evaluating options, we've chosen a simpler build approach:
- esbuild for JS bundling (fast, lightweight)
- postcss-cli for CSS processing
- Simple Node scripts for file management
- Minimal dependencies

Benefits:
- Fewer dependencies
- Simpler build process
- Easier debugging
- Better control over output

## Next Steps

1. **Complete Build System**
   - Verify JS bundling with esbuild
   - Test CSS processing
   - Ensure proper extension structure
   - Document build process

2. **Testing Infrastructure**
   - Implement essential component tests
   - Add integration tests for core flows
   - Set up CI/CD pipeline

3. **Documentation**
   - Update all SOPs with final implementation details
   - Add troubleshooting guides
   - Document testing procedures

## Implementation Decisions (Q&A)

### 1. Abort Button Implementation
- The extension will **not** trigger Chess.com's abort functionality directly
- Will only detect when game was aborted on Chess.com (using selectors from fetch-details.md)
- Popup should close immediately when abort action is detected

### 2. Game Detection Strategy
- Will implement URL change detection for new games (`/game/live/{id}`)
- Need to prevent popup from reopening on the same game after being closed
- Can use chrome.storage if needed for game ID tracking
- Focus on implementing the safest and most straightforward approach

### 3. Risk Score Display Details
- Will show detailed breakdown of contributing factors and scores
- Display format similar to test-risk-score.js output but simplified:
  - Remove technical debug info and thresholds
  - Focus on scores and weights
  - Show final formula calculation
- Use color gradient for risk levels:
  - Green (low risk)
  - Yellow (medium risk)
  - Red (high risk)

### 4. Debug Mode Implementation
- Debug toggle will be implemented in Chrome extension options page
- Keep debug controls hidden/discrete to avoid user confusion
- Debug mode intended only for developers and founder

### 5. Development Priority Order
1. Implement game detection functionality first (following fetch-details.md)
2. Create basic UI and build system
3. Enable manual testing in debug mode to validate fetch-details.md instructions

### 6. Documentation Strategy
- Add implementation notes and results to frontend-plan.md as tasks are completed
- Create separate .SOP files for technical details of specific components
- For new features:
  1. Write dedicated SOP first
  2. Define clear sections and tasks
  3. Follow the documented instructions during implementation

## Success Criteria
1. Build system:
   - Clean, reproducible builds
   - Proper extension structure
   - CSS processing working
   - JS modules bundled correctly

2. Testing:
   - Core components tested
   - Integration tests passing
   - Debug mode functional

3. Documentation:
   - All SOPs updated
   - Build process documented
   - Testing procedures clear
