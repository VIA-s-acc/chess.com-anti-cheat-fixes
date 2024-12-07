# Build System SOP

## Objective
Implement a simple, reliable build system for the Chess.com Risk Score Chrome Extension.

## Components

### 1. JavaScript Bundling (esbuild)
- Bundle all JS modules
- Handle imports/exports
- Maintain source maps for development

### 2. CSS Processing
- Process Tailwind CSS
- Handle PostCSS transformations
- Generate final styles.css

### 3. Static Files
- Copy manifest.json
- Copy HTML files
- Maintain extension structure

## Build Scripts

### Development Build
```bash
npm run dev
```
- Watches for changes
- Rebuilds automatically
- Maintains source maps

### Production Build
```bash
npm run build
```
- Minifies output
- Removes source maps
- Optimizes assets

## Directory Structure
```
dist/
  ├── manifest.json
  ├── popup/
  │   ├── popup.html
  │   ├── popup.js
  │   └── styles.css
  ├── background.js
  └── content.js
```

## Testing Build
1. Run build command
2. Load extension in Chrome
3. Verify all components work
4. Check console for errors

## Common Issues
1. Missing files in dist/
2. CSS not processing
3. Module import errors

## Success Criteria
- Clean builds without errors
- All files in correct locations
- CSS properly processed
- JS modules working
- Extension loads in Chrome 