# Antidetect Browser

Antidetect browser with unique fingerprints for each profile.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Run in development mode
npm run dev

# In another terminal, start Electron
npm run start
```

## Build Release

### Windows (.exe)
```bash
npm run build
npm run dist -- --win
```
Output: `release/Antidetect Browser Setup x.x.x.exe`

### macOS (.dmg)
```bash
npm run build
npm run dist -- --mac
```
Output: `release/Antidetect Browser-x.x.x.dmg`

### Linux (.AppImage)
```bash
npm run build
npm run dist -- --linux
```
Output: `release/Antidetect Browser-x.x.x.AppImage`

### All platforms
```bash
npm run build
npm run dist -- --win --mac --linux
```

## Features

- **Profile Management** - Create, edit, delete browser profiles
- **Unique Fingerprints** - Each profile gets unique:
  - User Agent & Platform
  - Screen resolution
  - Canvas fingerprint
  - WebGL vendor/renderer
  - Audio fingerprint
  - Timezone & Language
  - Hardware concurrency
  - Device memory
  - WebRTC protection
  - Client rects noise
- **Proxy Support** - HTTP/HTTPS/SOCKS4/SOCKS5 per profile
- **Session Persistence** - Cookies and storage saved per profile

## Project Structure

```
src/
├── core/           # Core modules
│   ├── types.ts    # TypeScript types
│   ├── database.ts # SQLite database
│   └── browser.ts  # Playwright browser control
├── fingerprint/
│   ├── generator.ts # Fingerprint generation
│   └── inject.ts    # Browser injection script
├── proxy/
│   └── manager.ts   # Proxy testing & config
├── main/
│   ├── index.ts     # Electron main process
│   └── preload.ts   # Preload script
└── renderer/        # React UI
    ├── App.tsx
    ├── components/
    └── styles/
```

## Requirements

- Node.js 18+
- npm or yarn
- Chrome/Chromium (for browser engine)
