# Chess.com Opponent Risk Score Extension

A Chrome extension that helps detect potential cheaters on Chess.com by calculating a risk score based on player statistics and game history.
![alt text](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*mA0MN3KyaxVchSrJTo9NQg.png)


## Features

- Real-time risk score calculation for opponents
- Automatic detection of a new game
- Breakdown of contributing risk factors
- Support for all speed chess formats (Bullet, Blitz, Rapid)

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

Created by [Tim Sh](https://medium.com/@tim.sh)
