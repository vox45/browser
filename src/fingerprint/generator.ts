import { v4 as uuidv4 } from 'uuid';
import {
  Fingerprint,
  ScreenConfig,
  WebGLConfig,
  CanvasConfig,
  AudioConfig,
  WebRTCConfig,
  MediaDevicesConfig,
} from '../core/types';

// User Agent data
const USER_AGENTS = {
  windows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
  macos: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ],
  linux: [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ],
};

const PLATFORMS = {
  windows: 'Win32',
  macos: 'MacIntel',
  linux: 'Linux x86_64',
};

const LANGUAGES = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'pt-BR',
  'ru-RU',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'pl-PL',
  'nl-NL',
  'tr-TR',
];

const TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
];

const SCREEN_RESOLUTIONS: ScreenConfig[] = [
  { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  { width: 1536, height: 864, availWidth: 1536, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.25 },
  { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  { width: 1280, height: 720, availWidth: 1280, availHeight: 680, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  { width: 1680, height: 1050, availWidth: 1680, availHeight: 1010, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  { width: 1600, height: 900, availWidth: 1600, availHeight: 860, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 30, pixelDepth: 30, devicePixelRatio: 2 },
  { width: 3840, height: 2160, availWidth: 3840, availHeight: 2120, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
];

const WEBGL_VENDORS = ['Google Inc.', 'Intel Inc.', 'NVIDIA Corporation', 'AMD'];

const WEBGL_RENDERERS = {
  'Google Inc.': [
    'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (Intel, Intel(R) Iris Xe Graphics Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
  ],
  'Intel Inc.': [
    'Intel Iris OpenGL Engine',
    'Intel UHD Graphics 620',
    'Intel Iris Plus Graphics 640',
  ],
  'NVIDIA Corporation': [
    'NVIDIA GeForce GTX 1650/PCIe/SSE2',
    'NVIDIA GeForce RTX 3070/PCIe/SSE2',
    'NVIDIA GeForce GTX 1080 Ti/PCIe/SSE2',
  ],
  'AMD': [
    'AMD Radeon Pro 5500M OpenGL Engine',
    'AMD Radeon RX 580 Series',
    'AMD Radeon RX 6700 XT',
  ],
};

const FONTS = [
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Georgia',
  'Impact',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Webdings',
  'Wingdings',
  'Tahoma',
  'Palatino Linotype',
  'Lucida Console',
  'Lucida Sans Unicode',
  'MS Gothic',
  'MS PGothic',
  'MS Sans Serif',
  'MS Serif',
  'Segoe UI',
  'Calibri',
  'Cambria',
  'Consolas',
];

// Helper functions
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fingerprint generators
export function generateUserAgent(os: 'windows' | 'macos' | 'linux' = 'windows'): string {
  return randomItem(USER_AGENTS[os]);
}

export function generatePlatform(os: 'windows' | 'macos' | 'linux' = 'windows'): string {
  return PLATFORMS[os];
}

export function generateLanguage(): { language: string; languages: string[] } {
  const primary = randomItem(LANGUAGES);
  const secondary = LANGUAGES.filter(l => l !== primary);
  const numLanguages = randomInt(1, 3);
  const languages = [primary, ...shuffleArray(secondary).slice(0, numLanguages)];

  return {
    language: primary,
    languages,
  };
}

export function generateScreen(): ScreenConfig {
  return { ...randomItem(SCREEN_RESOLUTIONS) };
}

export function generateWebGL(): WebGLConfig {
  const vendor = randomItem(WEBGL_VENDORS);
  const renderers = WEBGL_RENDERERS[vendor as keyof typeof WEBGL_RENDERERS];
  const renderer = randomItem(renderers);

  return {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: vendor,
    unmaskedRenderer: renderer,
    noise: randomFloat(0.0001, 0.001),
  };
}

export function generateCanvas(): CanvasConfig {
  return {
    noise: randomFloat(0.0001, 0.001),
  };
}

export function generateAudio(): AudioConfig {
  return {
    noise: randomFloat(0.0001, 0.0005),
  };
}

export function generateTimezone(): string {
  return randomItem(TIMEZONES);
}

export function generateFonts(): string[] {
  const numFonts = randomInt(15, 22);
  return shuffleArray(FONTS).slice(0, numFonts);
}

export function generateWebRTC(mode: 'real' | 'disabled' | 'fake' = 'disabled'): WebRTCConfig {
  return {
    mode,
    publicIp: null,
    localIps: [],
  };
}

export function generateMediaDevices(): MediaDevicesConfig {
  return {
    videoinput: randomInt(0, 2),
    audioinput: randomInt(1, 3),
    audiooutput: randomInt(1, 3),
  };
}

export function generateHardwareConcurrency(): number {
  const values = [2, 4, 6, 8, 12, 16];
  return randomItem(values);
}

export function generateDeviceMemory(): number {
  const values = [2, 4, 8, 16, 32];
  return randomItem(values);
}

// Main fingerprint generator
export interface GenerateFingerprintOptions {
  os?: 'windows' | 'macos' | 'linux';
  webrtcMode?: 'real' | 'disabled' | 'fake';
}

export function generateFingerprint(options: GenerateFingerprintOptions = {}): Fingerprint {
  const { os = 'windows', webrtcMode = 'disabled' } = options;

  const { language, languages } = generateLanguage();

  return {
    userAgent: generateUserAgent(os),
    platform: generatePlatform(os),
    language,
    languages,
    hardwareConcurrency: generateHardwareConcurrency(),
    deviceMemory: generateDeviceMemory(),
    maxTouchPoints: os === 'windows' ? randomInt(0, 1) : 0,
    screen: generateScreen(),
    webgl: generateWebGL(),
    canvas: generateCanvas(),
    audio: generateAudio(),
    timezone: generateTimezone(),
    fonts: generateFonts(),
    webrtc: generateWebRTC(webrtcMode),
    clientRectsNoise: randomFloat(0.1, 2),
    mediaDevices: generateMediaDevices(),
  };
}
