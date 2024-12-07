# Build and Test System SOP

## Implementation Status

### Completed
- ✅ Basic test infrastructure
- ✅ Component tests for RiskDisplay
- ✅ Integration tests for PopupManager
- ✅ Test setup with mocks
- ✅ Build system configuration

### Pending
- 🔄 End-to-end tests
- 🔄 Visual regression tests
- 🔄 Performance tests

## Build System

### 1. Parcel Configuration
- Entry point: manifest.json
- Config: @parcel/config-webextension
- Asset handling:
  - ✅ Tailwind CSS via PostCSS
  - ✅ Module bundling
  - ✅ Source maps (development only)

### 2. Build Scripts
```json
{
  "scripts": {
    "clean": "rm -rf dist/",
    "build": "parcel build src/frontend/manifest.json --config @parcel/config-webextension",
    "dev": "parcel watch src/frontend/manifest.json --config @parcel/config-webextension",
    "test": "jest"
  }
}
```

## Testing Infrastructure

### 1. Essential Tests (MVP)
- ✅ RiskDisplay Component:
  - Score circle updates
  - Color transitions
  - Format breakdown
  - Factor display
- ✅ Message Handling:
  - Basic validation
  - Error cases
- 🔄 Integration:
  - Game detection to popup display

### 2. Future Tests
- Visual Regression:
  - Screenshot comparisons
  - Layout consistency
- End-to-End:
  - Complete user flows
  - Chrome API integration
- Performance:
  - Load time measurements
  - Memory usage

### 3. Test Configuration
- ✅ Jest setup with JSDOM
- ✅ Chrome API mocks
- ✅ Test utilities and helpers

## Build Instructions

1. Development Build:
```bash
npm run clean && npm run dev
```

2. Production Build:
```bash
npm run clean && npm run build
```

3. Common Issues:
   - If build fails, try removing node_modules and package-lock.json
   - Run `npm install` again
   - Ensure all paths in manifest.json are relative
   - Check that all imported modules exist

3. Load Extension in Chrome:
- Open chrome://extensions/
- Enable Developer mode
- Click "Load unpacked"
- Select the `dist` directory

## Testing Instructions

1. Run All Tests:
```bash
npm test
```

2. Watch Mode:
```bash
npm run test:watch
```

3. Run Specific Tests:
```bash
npm test RiskDisplay
npm test PopupManager
```

## Next Steps
1. ✅ Complete build system setup
2. ✅ Implement essential tests
3. 🔄 Add end-to-end tests
4. 🔄 Set up visual regression testing 

## Common Build Issues

1. Parcel Version Mismatch
   ```bash
   # If you encounter version mismatch errors:
   npm uninstall parcel @parcel/config-webextension
   npm install --save-dev parcel@2.12.0 @parcel/config-webextension@2.12.0
   ```

2. Clean Build
   ```bash
   # For a fresh build:
   rm -rf dist/ .parcel-cache node_modules package-lock.json
   npm install
   npm run build
   ```

3. Development Build
   ```bash
   # For development with watch mode:
   npm run dev
   ```