// Profile types
export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  fingerprint: Fingerprint;
  proxy: ProxyConfig | null;
  notes: string;
}

// Fingerprint configuration
export interface Fingerprint {
  // Navigator
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;

  // Screen
  screen: ScreenConfig;

  // WebGL
  webgl: WebGLConfig;

  // Canvas
  canvas: CanvasConfig;

  // Audio
  audio: AudioConfig;

  // Timezone
  timezone: string;

  // Fonts
  fonts: string[];

  // WebRTC
  webrtc: WebRTCConfig;

  // ClientRects noise
  clientRectsNoise: number;

  // Media devices
  mediaDevices: MediaDevicesConfig;

  // Geolocation
  geolocation: GeolocationConfig;
}

export interface GeolocationConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ScreenConfig {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
}

export interface WebGLConfig {
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  noise: number; // 0-1, amount of noise to add
}

export interface CanvasConfig {
  noise: number; // 0-1, amount of noise to add to canvas
}

export interface AudioConfig {
  noise: number; // 0-1, amount of noise to add to audio context
}

export interface WebRTCConfig {
  mode: 'real' | 'disabled' | 'fake';
  publicIp: string | null;
  localIps: string[];
}

export interface MediaDevicesConfig {
  videoinput: number; // number of cameras
  audioinput: number; // number of microphones
  audiooutput: number; // number of speakers
}

// Proxy configuration
export interface ProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

// Browser instance
export interface BrowserInstance {
  profileId: string;
  browser: any; // Playwright Browser
  context: any; // Playwright BrowserContext
  pages: any[]; // Playwright Pages
}

// IPC Events
export type IPCChannel =
  | 'profile:list'
  | 'profile:create'
  | 'profile:update'
  | 'profile:delete'
  | 'profile:launch'
  | 'profile:stop'
  | 'profile:export'
  | 'profile:import'
  | 'browser:status'
  | 'fingerprint:generate'
  | 'proxy:test';
