# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Canvas Cut** - A professional single-page image cropping tool built with Vue 3 + TypeScript. Features a fresh mint green theme with pixel-precise crop selection, high-DPI support, and drag-and-drop interface.

### Key Technology Stack
- **Vue 3** + TypeScript - Core framework
- **Vite** - Build tool and dev server (with HMR)
- **Pinia** - State management
- **Vue Router 4** - Routing (configured but single-page app)
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **ESLint 9 + Prettier** - Code quality

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build
npm run build-only    # Build without type checking

# Type checking
npm run type-check    # Vue TypeScript checking

# Testing
npm run test:unit     # Vitest unit tests
npm run test:e2e      # Playwright E2E tests

# Code quality
npm run lint          # ESLint with auto-fix
npm run format        # Prettier formatting

# Preview production build
npm run preview
```

## Architecture & Structure

### Core Components Flow
```
App.vue (Main Controller)
├── ImageUploader.vue      # File upload (drag-drop + click)
│   └── Emits: image-loaded, image-cleared
├── CropperCanvas.vue      # Canvas rendering (800x600 max)
│   ├── CoordinateDisplay.vue
│   └── useCanvasDPI()     # High-DPI adapter composables
├── ControlPanel.vue       # Action buttons & toggles
└── Result display section # Export & download
```

### Key Data Types (src/types/index.ts)
```typescript
interface Point { x: number; y: number }
interface CropArea { topLeft: Point; bottomRight: Point }
interface CropResult { canvas, dataUrl, blob, width, height }
enum AnchorStatus { NONE = 'none', FIRST = 'first', BOTH = 'both' }
```

### State Management in App.vue
- `imageInfo` - Loaded image metadata and source
- `cropArea` - Current crop region (null until both anchors set)
- `cropResult` - Exported crop result
- `coordinatesHistory` - History stack for undo functionality
- `currentAnchorStatus` - Tracks anchor selection state
- `showCoordinates` - Toggle for coordinate display
- `isProcessing` - Loading state during export

### Canvas Coordinate System
The CropperCanvas uses a two-layer coordinate system:
1. **Canvas Space** (0-800px) - What user sees and clicks
2. **Image Space** (natural size) - The actual image pixels
3. **Translators**: `canvasToImageCoords()` / `imageToCanvasCoords()` via `useCanvasDPI`

The crop is always exported in **image space** coordinates for pixel-perfect results.

### Key External Libraries
- None! Pure vanilla Vue 3 + browser APIs
- Canvas API for all image manipulation
- FileReader for loading images
- Drag & Drop API for file upload

## Workflow: How Cropping Works

1. **Upload**: Select PNG/JPG/WebP file → FileReader → DataURL
2. **Anchors**:
   - First click → sets `firstAnchor` (top-left preview dot)
   - Second click → sets `secondAnchor`, creates `cropArea`
3. **Adjust**: Drag anchors to fine-tune region (bounds-checked)
4. **Export**:
   - Creates temp canvas → `exportCroppedImage()`
   - Draws sub-rectangle from source image
   - Handles high-DPI scaling automatically
5. **Download**: Blob → hidden `<a>` → filename with timestamp

## Keyboard Shortcuts (via useKeyboard composable)
- **ESC**: Cancel current selection
- **Enter**: Confirm/export crop
- **R**: Reset all state
- **Ctrl/Cmd+Z**: Undo last action

## Theming System (src/assets/theme.css)
CSS Variables control the mint green theme:
- Primary: `#A8E6CF` (soft mint)
- Dark: `#2D5A4A` (deep moss)
- Background: `#F0F9F4` (light mint)
- Coordinates: `--coord-bg`, `--coord-border`

## Testing Setup
- **Unit tests**: `src/components/__tests__/` (Vitest + Vue Test Utils)
- **E2E tests**: `e2e/` (Playwright - cross-browser)
- Configured TypeScript support in vitest.config.ts and tsconfig.vitest.json

## Important Notes for Development

### High-DPI Canvas Handling
The `useCanvasDPI` composable is critical for supporting retina displays:
- Calculates `devicePixelRatio`
- Scales canvas backing store vs CSS size
- All drawing operations consider DPR scaling

### Performance Optimizations
- Image caching: `imgCache` in CropperCanvas prevents flickering
- Debounced coordinate updates
- Canvas reuse for export (single temp canvas)

### Edge Cases Handled
- Drag-outside-boundary mouseleave detection
- Coordinate clamping to image dimensions
- Cross-origin image handling (`crossOrigin = 'anonymous'`)
- Anchor hit-test threshold (12px scaled radius)
- Non-square crop validation

### Common Development Tasks

**Adding a new export format (JPEG):**
1. Modify `imageExport.ts:exportCroppedImage()` - change `'image/png'` to format parameter
2. Update `ControlPanel.vue` format selector
3. Update type constant for format in `types/index.ts`

**Adjusting canvas max size:**
1. `CropperCanvas.vue:canvasSize` computed (default: 800x600)
2. Export maintains natural size
3. Update `ImageUploader.vue` validation if needed

**Adding keyboard shortcuts:**
1. Update `composables/useKeyboard.ts:DEFAULT_SHORTCUTS`
2. Update `App.vue:useKeyboard()` call
3. Update `ControlPanel.vue` shortcut display

### File Naming Conventions
- Composables: `useXyz.ts` (camelCase with 'use' prefix)
- Components: `PascalCase.vue`
- Types: `types/index.ts` (centralized)
- Utilities: `camelCase.ts`

### Browser Compatibility
- Target: Modern browsers with ES2020+ support
- Canvas API required (checked in App.vue mount)
- Drag & Drop API required
- ES modules only

## Project Configuration Files
- `vite.config.ts`: Vue plugins + aliases (`@/src`), dev tools
- `tsconfig.json`: TypeScript strict mode, project references
- `eslint.config.ts`: Vue 3 + TypeScript rules, Playwright plugin
- `vitest.config.ts`: JSDOM environment for unit tests
- `playwright.config.ts`: Cross-browser (Chromium, Firefox, WebKit)