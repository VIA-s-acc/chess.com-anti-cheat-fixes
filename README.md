# Chess.com Opponent Risk Score Extension - Enhanced

A Chrome extension that helps detect potential cheaters on Chess.com by calculating a risk score based on player statistics and game history.

> **Note:** This is an enhanced fork of [tim-sha256/chess.com-anti-cheat](https://github.com/tim-sha256/chess.com-anti-cheat) with additional features including scoring history tracking, automated report monitoring, and weekly status checks.

![alt text](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*mA0MN3KyaxVchSrJTo9NQg.png)

## Features

### Core Features (Original)

- Real-time risk score calculation for opponents
- Automatic detection of a new game
- Breakdown of contributing risk factors
- Support for all speed chess formats (Bullet, Blitz, Rapid)

### Enhanced Features (v1.2.0+)

- **Scoring History:** Track all analyzed opponents with timestamps and risk scores
- **Search & Filter:** Find past analyses by username, format, or risk level
- **Export Data:** Export history to JSON or CSV formats
- **Statistics Dashboard:** View total analyzed players and average risk scores

### Enhanced Features (v1.4.0+)

- **Reports Tracking:** Mark suspicious players for long-term monitoring
- **Automated Status Checks:** Weekly automatic verification of reported accounts
- **Ban Detection:** Get notified when reported accounts are banned by Chess.com
- **Encounter Tracking:** See how many times you've faced the same opponent
- **Status History:** Complete audit trail of account status changes

## Installation

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/chesscom-opponent-risk-sc/oiemcgpbdohnhkplobgndgdhdlbafoeg).

## Development

### Install dependencies
```bash
npm install
```

### Build extension
```bash
npm run build
```

### Run risk score tests
```bash
# Test specific username with debug output
npm run test-risk -- username --debug

# Example
npm run test-risk -- DrNykterstein --debug
```

## How It Works

The extension uses Chess.com's public API to gather:
- Win/Lose/Draw statistics across different time controls
- Recent game performance, including accuracies
- Account age and rating

For detailed information about the mathematical model and methodology, read the [Medium article](https://medium.com/@tim.sh/i-made-a-chrome-extension-to-help-avoid-playing-cheaters-in-chess-d61f75fb2e57).

## Technical Details

- Built with vanilla JavaScript
- Uses esbuild for bundling
- Chrome Extension Manifest V3
- Real-time DOM monitoring for game detection
- Implements debouncing and state management

## Configuration

Default settings and thresholds can be adjusted [here](https://github.com/tim-sha256/chess.com-anti-cheat/blob/main/src/config.js):

```javascript
export const SETTINGS = {
  RATED_ONLY: true, // When true, only consider rated games for risk score
  AUTO_OPEN_POPUP: true // When true, automatically open popup when opponent is detected
};
```

## Changelog

### v1.4.0-beta (2025-10-19)

#### Reports Tracking & Automated Monitoring

- **ReportsService:** Complete CRUD system for tracking suspicious players
  - Track reported users with status (pending, active, banned, closed)
  - Automatic deduplication with encounter counting
  - Full status history with timestamps
  - Export reports to JSON/CSV

- **Weekly Status Checker:** Automated account verification
  - Chrome alarms API for scheduled weekly checks
  - Detect banned/closed accounts via Chess.com API
  - Browser notifications for status changes
  - Manual trigger option from UI
  - Batch processing with rate limiting

- **Reports UI:** Comprehensive tracking interface
  - New "Reports" tab in popup
  - Search and filter by status/risk level
  - Statistics dashboard (total reported, banned, need check, recent bans)
  - Color-coded status indicators
  - Pulsing animation for accounts needing check
  - Individual and bulk status checking
  - Pagination and sorting options

- **Permissions:** Added `alarms` and `notifications` permissions

### v1.2.0-beta (2025-10-19)

#### Scoring History & Data Tracking

- **HistoryService:** Complete scoring history management
  - Auto-save risk scores after each calculation
  - Deduplication logic (same user + game)
  - Maximum 100 entries with auto-cleanup
  - Caching system with 5-second TTL

- **History UI:** Full-featured interface
  - New "History" tab in popup
  - Search by username
  - Filter by game format (rapid, blitz, bullet)
  - Filter by risk level (low, medium, high, critical)
  - Sort by date, username, or risk score
  - Pagination (10 entries per page)
  - Export to JSON/CSV
  - Statistics dashboard

- **Tab Navigation:** Multi-tab interface
  - Current: Live risk score display
  - History: Past analyses
  - Responsive tab switching with lazy loading

### v1.0.0

#### Initial Release (Original Project by Tim Sh)

- Real-time opponent risk score calculation
- Chess.com public API integration
- Support for all time controls (bullet, blitz, rapid)
- Automatic game detection
- Risk factor breakdown
- Chrome Extension Manifest V3

---

**Original Project:** Created by [Tim Sh](https://medium.com/@tim.sh)

**Enhanced Fork:** Maintained by VIA-s-acc
