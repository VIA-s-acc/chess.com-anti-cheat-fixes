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

### Enhanced Features (v1.6.0+)

- **Abort Counter:** Real-time tracking of game aborts
- **Cooldown Detection:** Automatic detection of abort cooldown periods
- **Proactive Warnings:** Alerts before you hit the abort limit
- **STOP PLAYING Alerts:** Critical warnings during cooldown to avoid cheaters
- **Live Countdown:** Real-time timer showing cooldown remaining
- **Smart Recommendations:** Context-aware advice based on abort status
- **High-Risk Abort Buttons:** Quick abort/skip buttons for suspicious opponents

### Enhanced Features (v1.8.0+)

- **Customizable Thresholds:** Fine-tune detection sensitivity for your playstyle
- **Risk Level Configuration:** Adjust when Medium/High/Critical warnings trigger
- **Action Thresholds:** Control when abort buttons and alerts appear
- **Quick Presets:** 4 ready-to-use configurations (Conservative/Balanced/Aggressive/Paranoid)
- **Import/Export Configs:** Share and backup your custom settings as JSON
- **Real-Time UI Updates:** Colors and warnings adapt to your thresholds instantly

### NEW! Enhanced Features (v2.0.0 - Major Release)

- **📊 Statistics Dashboard:** Personal analytics tracking
  - Games analyzed counter with time-based filters (24h/7d/30d/all)
  - Suspicious players encountered metrics
  - Abort effectiveness percentage calculator
  - Win rate vs suspicious opponents tracker
  - Risk distribution visualization with animated bars
  - Game format breakdown (Bullet/Blitz/Rapid)
  - Suspicious players rate percentage
  - Top-10 most suspicious encountered players list
  - Export/import statistics as JSON

- **🌐 Global Cheater Database (Optional):**
  - Local Python server for crowdsourced data sharing
  - Anonymous report submission system
  - Player reputation lookup with confidence levels
  - Real-time health check and server status
  - Configurable server URL in extension options
  - Report aggregation with confidence ratings (low/medium/high/confirmed)
  - Privacy-focused: only usernames, risk scores, and formats shared

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

### General Settings

Access the extension's options page to configure:

- **Rated Games Only**: Include only rated games in risk calculations
- **Auto-Open Popup**: Automatically open popup when opponent is detected (Chrome 127+)

### Risk Score Thresholds (v1.8.0+)

Customize detection sensitivity in the options page:

**Quick Presets:**
- **Conservative** (40/60/80/95): Higher thresholds, fewer false positives
- **Balanced** (30/50/70/85): Default settings, balanced sensitivity
- **Aggressive** (20/40/60/80): Lower thresholds, catch more suspects
- **Paranoid** (15/30/50/70): Maximum sensitivity, flag everything

**Manual Configuration:**
- Medium/High/Critical risk level thresholds
- Abort button trigger threshold
- Auto-warn threshold
- Critical alert threshold

**Import/Export:**
- Export your configuration as JSON
- Import shared configurations from other users
- Backup and restore your custom settings

### Global Cheater Database Setup (v2.0.0+)

The Global Database is **optional** and runs locally on your machine:

**Quick Start:**
1. Navigate to `server/` directory
2. Run `run.bat` (Windows) or see [QUICK_START.md](QUICK_START.md) for other platforms
3. Open extension Options → Global Cheater Database
4. Enable database and click "Test Connection"
5. Server runs on `http://localhost:8000` by default

**Features:**
- Anonymous crowdsourced data sharing
- Real-time player reputation lookups
- Confidence ratings based on multiple reports
- Full API documentation at `http://localhost:8000/docs`

For detailed setup instructions, see [QUICK_START.md](QUICK_START.md) and [server/README.md](server/README.md).

## Changelog

### v2.0.0 - Major Release (2025-10-20)

**🎉 Major Features:**

**📊 Statistics Dashboard:**
- Personal analytics tracking with time-based filters (24h/7d/30d/all-time)
- Games analyzed counter and suspicious encounters tracker
- Abort effectiveness calculator (% of successful aborts vs losses)
- Win rate vs suspicious opponents
- Risk distribution visualization with animated horizontal bars
- Game format breakdown (Bullet/Blitz/Rapid) with suspicious player counts
- Top-10 most suspicious players list with encounter counts and average risk scores
- Export/import statistics as JSON
- New Statistics tab in popup UI

**🌐 Global Cheater Database:**
- Optional local Python FastAPI server for crowdsourced intelligence
- Automatic report submission to global database when enabled
- Anonymous reporting with SHA256 hashed reporter IDs
- Player reputation lookup with confidence levels:
  - **Confirmed:** 10+ reports, 80%+ avg risk
  - **High:** 5+ reports, 70%+ avg risk
  - **Medium:** 3+ reports, 60%+ avg risk
  - **Low:** < 3 reports or lower risk
- Real-time health check and server status monitoring
- Configurable server URL in options page
- Full REST API with Swagger documentation at `/docs`
- Privacy-focused: only usernames, risk scores, and formats shared

**✨ UI/UX Improvements:**
- Animated slide-in/fade-out notifications for settings changes
- Success (✓) and error (✕) icons in notifications
- Compact tab navigation for better space usage
- Improved overflow handling in Statistics view
- Vertical layout for Global DB status to prevent text overflow

**Technical Improvements:**
- New services: `StatisticsService`, `GlobalDatabaseService`
- New components: `StatisticsView`
- Integrated Global Database with `ReportsService`
- Server API endpoints: health, submit report, player reputation, search, statistics
- File-based storage with JSON (upgradeable to PostgreSQL)
- Time-based filtering for statistics
- Confidence level calculation algorithm

**Bug Fixes:**
- Fixed `getStatistics()` to accept `timeFilter` parameter
- Fixed singleton service initialization in `StatisticsView`
- Fixed Global Database settings save/load
- Fixed horizontal overflow in Statistics tab
- Fixed tab navigation to fit all 4 tabs (Current/History/Reports/Statistics)

### v1.8.1-beta (2025-10-20)

#### Abort Counter Fix

- **Fixed Abort Detection:** Abort counter now properly updates when games are aborted
- **Multi-Language Support:** Detects abort in English ("aborted") and Russian ("прервана")
- **Improved Detection Methods:**
  - Added `.game-over-message-component` selector
  - 6 different abort detection methods for reliability
  - No debounce delay - instant abort detection
  - Enhanced logging for debugging
- **Better Data Passing:** Improved abort data transmission from content script to background

**Bug Fixed:** Previously, the abort counter would not update when users aborted games. Now it tracks all aborts immediately and reliably.

### v1.8.0-beta (2025-10-20)

#### Customizable Risk Score Thresholds

- **ThresholdSettingsService:** Advanced threshold management
  - Risk level thresholds (Low/Medium/High/Critical)
  - Action button thresholds (Abort/Warn/Alert)
  - Import/Export configurations as JSON
  - Full validation and merge with defaults
  - Caching system with 5-minute TTL

- **Quick Presets:** 4 pre-configured sensitivity levels
  - Conservative: Higher thresholds (40/60/80/95)
  - Balanced: Default settings (30/50/70/85)
  - Aggressive: Lower thresholds (20/40/60/80)
  - Paranoid: Maximum sensitivity (15/30/50/70)

- **Settings UI:** Comprehensive threshold configuration
  - Preset selector dropdown
  - 6 customizable threshold sliders
  - Import/Export configuration buttons
  - Reset to defaults functionality
  - Real-time validation and feedback
  - Success/error message display

- **Dynamic Integration:**
  - RiskDisplay: Colors adapt to custom thresholds
  - AbortStatus: Skip button respects custom threshold
  - Real-time UI updates based on preferences
  - Backward compatible with defaults

- **Configuration Management:**
  - Export settings as JSON files
  - Import configurations from files
  - Version tracking for compatibility
  - Share optimal settings with others

**Why this matters:** Every player has different tolerance for risk. Customize thresholds to match your playstyle - conservative for casual games, aggressive for competitive play.

### v1.6.0-beta (2025-10-19)

#### Abort Counter & Cooldown Tracker

- **AbortTrackerService:** Smart abort monitoring system
  - Track all game aborts automatically
  - Rolling 1-hour window for abort counting
  - Limit detection (~10 aborts before cooldown)
  - 15-minute cooldown tracking
  - Abort history with opponent names and timestamps

- **Cooldown Prevention:** Proactive warnings to avoid lockout
  - Warning at 8/10 aborts used
  - Critical alert when limit reached
  - Real-time cooldown countdown timer
  - Browser notifications for warnings
  - "STOP PLAYING" alerts during cooldown

- **Abort Status UI:** Visual abort counter in popup
  - Color-coded status (green/yellow/red)
  - Progress bar showing aborts used
  - Live countdown during cooldown period
  - Recommendations based on current status
  - Abort history viewer
  - Reset function for testing
  - "Skip This Game" button (shows at high risk)

- **High-Risk Action Buttons:** Quick abort for suspicious opponents
  - "Abort Game" button in Contributing Factors (top)
  - "Skip This Game" button in Abort Counter (bottom)
  - Both buttons appear when risk score ≥ 60%
  - Confirmation dialogs with abort instructions
  - Shows remaining aborts in button text

- **Smart Prevention Logic:**
  - Warns before you hit the limit
  - Prevents playing during cooldown (can't abort cheaters!)
  - Shows exact time remaining in cooldown
  - Tracks total aborts and cooldown events

**Why this matters:** During cooldown, you cannot abort games. If you face a cheater, you'll be forced to play or resign. This feature helps you avoid that situation.

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
