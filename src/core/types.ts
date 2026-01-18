// Profile types
export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  fingerprint: Fingerprint;
  proxy: ProxyConfig | null;
  notes: string;
  // Start homepage settings
  startHomepage: boolean;
  homepageUrl: string;
  // Group/folder
  group: string;
  // Auto-start on app launch
  autoStart: boolean;
  // Statistics
  stats: ProfileStats;
}

export interface ProfileStats {
  launchCount: number;
  totalTimeMs: number;
  lastSessionStart: string | null;
  searchesCompleted: number;
  dailySetsCompleted: number;
}

export interface ProfileGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ProfileTemplate {
  id: string;
  name: string;
  os: 'windows' | 'macos' | 'linux';
  proxy: ProxyConfig | null;
  startHomepage: boolean;
  homepageUrl: string;
  group: string;
  autoStart: boolean;
  createdAt: string;
}

export interface FarmingSchedule {
  id: string;
  name: string;
  profileIds: string[];
  config: {
    desktopSearches: number;
    mobileSearches: number;
    dailySet: boolean;
  };
  schedule: {
    enabled: boolean;
    time: string; // HH:MM format
    days: number[]; // 0-6, Sunday = 0
  };
  lastRun: string | null;
  createdAt: string;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyOnStart: boolean;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
}

export interface BackupConfig {
  autoBackup: boolean;
  backupInterval: 'daily' | 'weekly' | 'monthly';
  maxBackups: number;
  lastBackup: string | null;
}

// Fingerprint configuration
export interface Fingerprint {
  // Unique seed - ensures each profile is unique and reproducible
  seed: string;

  // Navigator basic
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  vendor: string;
  vendorSub: string;
  product: string;
  productSub: string;
  appVersion: string;
  appName: string;
  appCodeName: string;
  oscpu: string;
  buildID: string;
  doNotTrack: string | null;
  cookieEnabled: boolean;
  pdfViewerEnabled: boolean;

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

  // Battery
  battery: BatteryConfig;

  // Connection/Network
  connection: ConnectionConfig;

  // Plugins
  plugins: PluginConfig[];

  // Client Hints (Sec-CH-UA)
  clientHints: ClientHintsConfig;

  // Speech Synthesis Voices
  speechVoices: SpeechVoiceConfig[];

  // Permissions API results
  permissions: PermissionsConfig;

  // Storage quota
  storageQuota: StorageQuotaConfig;

  // Performance timing noise
  performanceNoise: number;

  // Math fingerprint (sin/cos noise)
  mathNoise: number;

  // Date.getTimezoneOffset noise (in minutes)
  timezoneOffsetNoise: number;

  // History length
  historyLength: number;
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
  orientation: 'landscape-primary' | 'landscape-secondary' | 'portrait-primary' | 'portrait-secondary';
  isExtended: boolean;
}

export interface WebGLConfig {
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  version: string;
  shadingLanguageVersion: string;
  maxTextureSize: number;
  maxVertexAttribs: number;
  maxVertexUniformVectors: number;
  maxFragmentUniformVectors: number;
  maxVaryingVectors: number;
  aliasedLineWidthRange: [number, number];
  aliasedPointSizeRange: [number, number];
  maxViewportDims: [number, number];
  maxTextureImageUnits: number;
  maxCombinedTextureImageUnits: number;
  maxVertexTextureImageUnits: number;
  maxRenderbufferSize: number;
  maxCubeMapTextureSize: number;
  supportedExtensions: string[];
  noise: number;
}

export interface CanvasConfig {
  noise: number;
  // Unique canvas hash seed for this profile
  hashSeed: string;
}

export interface AudioConfig {
  noise: number;
  // Audio context sample rate
  sampleRate: number;
  // Base latency for AudioContext
  baseLatency: number;
  // Output latency
  outputLatency: number;
  // Unique audio hash seed
  hashSeed: string;
}

export interface WebRTCConfig {
  mode: 'real' | 'disabled' | 'fake';
  publicIp: string | null;
  localIps: string[];
}

export interface MediaDevicesConfig {
  videoinput: number;
  audioinput: number;
  audiooutput: number;
  // Unique device IDs
  deviceIds: {
    videoinput: string[];
    audioinput: string[];
    audiooutput: string[];
  };
}

export interface BatteryConfig {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

export interface ConnectionConfig {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
}

export interface PluginConfig {
  name: string;
  description: string;
  filename: string;
  mimeTypes: {
    type: string;
    suffixes: string;
    description: string;
  }[];
}

export interface ClientHintsConfig {
  brands: { brand: string; version: string }[];
  mobile: boolean;
  platform: string;
  platformVersion: string;
  architecture: string;
  bitness: string;
  model: string;
  fullVersionList: { brand: string; version: string }[];
}

export interface SpeechVoiceConfig {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  voiceURI: string;
}

export interface PermissionsConfig {
  geolocation: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
  camera: 'granted' | 'denied' | 'prompt';
  microphone: 'granted' | 'denied' | 'prompt';
  'persistent-storage': 'granted' | 'denied' | 'prompt';
  push: 'granted' | 'denied' | 'prompt';
  midi: 'granted' | 'denied' | 'prompt';
}

export interface StorageQuotaConfig {
  quota: number;
  usage: number;
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
