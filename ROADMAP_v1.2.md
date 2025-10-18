# Roadmap for v1.2.0 - Scoring History Feature

## Main Feature: History of All Scorings

### Overview
Add ability to track and display history of all risk score calculations for different opponents. This will allow users to:
- See all previously analyzed players
- Track changes in risk scores over time
- Quick access to past analyses
- Export history data

---

## Feature Specifications

### 1. Storage System

**File:** `src/frontend/services/HistoryService.js` (new)

**Functionality:**
- Store scoring results in `chrome.storage.local`
- Data structure:
```javascript
{
  history: [
    {
      id: "unique-id",
      username: "opponent-username",
      timestamp: 1234567890,
      gameId: "game-id",
      riskScore: {
        overall: 75,
        format: "rapid",
        details: {...}
      },
      playerStats: {
        rating: 1500,
        gamesPlayed: 100,
        // ... other stats
      }
    }
  ]
}
```

**Features:**
- Limit history to last 100 entries (configurable)
- Auto-cleanup of old entries
- Export to JSON/CSV
- Search by username
- Filter by date range, format, risk score range

---

### 2. UI Components

#### 2.1 History Tab in Popup

**File:** `src/frontend/popup/HistoryView.js` (new)

**Features:**
- Tab switcher: "Current" | "History"
- List view of past scorings:
  ```
  ┌──────────────────────────────────────┐
  │ ▼ History (45 entries)          [🔍] │
  ├──────────────────────────────────────┤
  │ [⚠️] MagnusCarlsen    85  1 hour ago │
  │ [✅] Hikaru           22  2 hours ago│
  │ [⚠️] DanielNaroditsky 78  1 day ago  │
  │ ...                                  │
  ├──────────────────────────────────────┤
  │ [Export] [Clear All]    Page 1 of 5  │
  └──────────────────────────────────────┘
  ```

- Click on entry to see full details
- Color-coded by risk level
- Show timestamp (relative time)
- Pagination (10-20 per page)

#### 2.2 History Detail View

**Features:**
- Full risk score breakdown
- Comparison with current stats (if available)
- "Re-analyze" button to get fresh data
- "View Profile" button to open Chess.com profile

#### 2.3 Search & Filter

**Features:**
- Search by username
- Filter dropdowns:
  - Time range (Today, This Week, This Month, All Time)
  - Format (Rapid, Blitz, Bullet, All)
  - Risk level (Low, Medium, High, Critical, All)
- Sort options:
  - Date (newest/oldest)
  - Risk score (highest/lowest)
  - Username (A-Z, Z-A)

---

### 3. Auto-Save Feature

**File:** `src/frontend/background.js` (update)

**Functionality:**
- Automatically save risk score calculation to history
- Save on successful calculation
- Option to disable auto-save in settings
- Deduplicate entries (same player analyzed multiple times)

**Settings:**
```javascript
{
  HISTORY: {
    ENABLED: true,
    MAX_ENTRIES: 100,
    AUTO_CLEANUP: true,
    AUTO_SAVE: true
  }
}
```

---

### 4. Export Functionality

**File:** `src/frontend/popup/ExportService.js` (new)

**Formats:**
1. **JSON** - Full data export
2. **CSV** - Spreadsheet-compatible
   ```
   Username,Risk Score,Format,Date,Game ID
   MagnusCarlsen,85,rapid,2025-10-18,123456
   ```
3. **Markdown** - Readable format for sharing

**Features:**
- Download as file
- Copy to clipboard
- Filter before export

---

### 5. Statistics Dashboard

**File:** `src/frontend/popup/StatsView.js` (new)

**Metrics:**
- Total players analyzed
- Average risk score
- Distribution chart:
  - Low risk: X%
  - Medium risk: X%
  - High risk: X%
  - Critical risk: X%
- Most analyzed formats
- Analysis timeline (graph showing activity over time)

---

## Implementation Plan

### Phase 1: Storage & Backend (Week 1)
- [ ] Create `HistoryService.js`
- [ ] Implement storage schema
- [ ] Add save/load/delete methods
- [ ] Add search & filter functions
- [ ] Write unit tests

### Phase 2: Auto-Save Integration (Week 1-2)
- [ ] Update `background.js` to save scores
- [ ] Add deduplication logic
- [ ] Implement max entries limit
- [ ] Add settings options

### Phase 3: UI Components (Week 2-3)
- [ ] Create `HistoryView.js` component
- [ ] Design and implement history list
- [ ] Add detail view
- [ ] Implement search/filter UI
- [ ] Add pagination

### Phase 4: Export & Stats (Week 3-4)
- [ ] Implement `ExportService.js`
- [ ] Add JSON/CSV/MD export
- [ ] Create `StatsView.js`
- [ ] Add statistics calculations
- [ ] Create visual charts (simple CSS-based)

### Phase 5: Testing & Polish (Week 4)
- [ ] End-to-end testing
- [ ] Performance testing with large datasets
- [ ] UI/UX improvements
- [ ] Documentation updates
- [ ] Prepare for release

---

## Technical Considerations

### Storage Limits
- `chrome.storage.local` quota: ~5MB
- Estimated entry size: ~2KB
- Max 100 entries = ~200KB (safe margin)
- Implement quota monitoring
- Alert user when approaching limit

### Performance
- Lazy loading for large lists
- Virtualized scrolling for 100+ items
- Indexed search (cache username index)
- Debounced search input

### Privacy
- All data stored locally
- No external sync
- Easy to clear all history
- Export for backup

### Backward Compatibility
- Check if `history` key exists in storage
- Migrate from old versions if needed
- Don't break existing functionality

---

## Files to Create/Modify

### New Files
```
src/frontend/services/HistoryService.js
src/frontend/services/ExportService.js
src/frontend/popup/HistoryView.js
src/frontend/popup/StatsView.js
src/frontend/popup/HistoryDetail.js
src/frontend/popup/history.css
```

### Modified Files
```
src/frontend/background.js          - Add auto-save logic
src/frontend/popup/popup.js         - Add history tab
src/frontend/popup/popup.html       - Add history UI
src/frontend/popup/styles.css       - Add history styles
src/frontend/options/options.js     - Add history settings
src/frontend/options/options.html   - Add history options
src/config.js                       - Add history config
```

---

## Settings to Add

**Options Page:**
```
History Settings
├─ [x] Enable scoring history
├─ [x] Auto-save scores after calculation
├─ Maximum history entries: [100] ▼
├─ [x] Auto-cleanup old entries
├─ [Clear All History] [Export History]
```

---

## Success Metrics

- [ ] Can save 100+ entries without performance issues
- [ ] Search returns results in <100ms
- [ ] UI responsive with full history
- [ ] Export works for all formats
- [ ] No data loss on extension updates
- [ ] User can find past analyses easily

---

## Future Enhancements (v1.3+)

- Sync history across devices (Chrome sync storage)
- Compare two players side-by-side
- Trend analysis (player improvement/decline over time)
- Advanced filtering (rating range, win rate, etc.)
- Notes/tags for entries
- Import history from CSV
- Charts with real charting library (Chart.js)
- Cloud backup option

---

## Branch Strategy

```
main (v1.1.0 - stable)
  └─ feature/v1.2-scoring-history (development)
       ├─ feature/history-storage
       ├─ feature/history-ui
       ├─ feature/export
       └─ feature/stats-dashboard
```

Merge to `main` when all features complete and tested.

---

**Target Release:** v1.2.0 - 4 weeks from start
**Current Status:** Planning phase
**Next Steps:** Create storage service and schema
