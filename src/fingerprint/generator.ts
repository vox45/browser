import { v4 as uuidv4 } from 'uuid';
import {
  Fingerprint,
  ScreenConfig,
  WebGLConfig,
  CanvasConfig,
  AudioConfig,
  WebRTCConfig,
  MediaDevicesConfig,
  GeolocationConfig,
  BatteryConfig,
  ConnectionConfig,
  PluginConfig,
  ClientHintsConfig,
  SpeechVoiceConfig,
  PermissionsConfig,
  StorageQuotaConfig,
} from '../core/types';

// Seeded random number generator for reproducible fingerprints
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) || 1;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBool(): boolean {
    return this.next() > 0.5;
  }

  pickOne<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  pickMany<T>(arr: T[], count: number): T[] {
    const shuffled = this.shuffle([...arr]);
    return shuffled.slice(0, Math.min(count, arr.length));
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  generateHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(this.next() * chars.length)];
    }
    return result;
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(this.next() * 16);
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Chrome versions (recent)
const CHROME_VERSIONS = [
  { major: 120, minor: 0, build: 6099, patch: 224 },
  { major: 121, minor: 0, build: 6167, patch: 85 },
  { major: 122, minor: 0, build: 6261, patch: 69 },
  { major: 123, minor: 0, build: 6312, patch: 86 },
  { major: 124, minor: 0, build: 6367, patch: 118 },
  { major: 125, minor: 0, build: 6422, patch: 112 },
];

// OS versions
const WINDOWS_VERSIONS = ['10.0', '11.0'];
const MACOS_VERSIONS = ['10_15_7', '11_0', '12_0', '13_0', '14_0', '14_1'];
const LINUX_KERNELS = ['5.15.0', '5.19.0', '6.1.0', '6.2.0', '6.5.0'];

const PLATFORMS = {
  windows: 'Win32',
  macos: 'MacIntel',
  linux: 'Linux x86_64',
};

const LANGUAGES = [
  { code: 'en-US', region: 'United States' },
  { code: 'en-GB', region: 'United Kingdom' },
  { code: 'de-DE', region: 'Germany' },
  { code: 'fr-FR', region: 'France' },
  { code: 'es-ES', region: 'Spain' },
  { code: 'it-IT', region: 'Italy' },
  { code: 'pt-BR', region: 'Brazil' },
  { code: 'ru-RU', region: 'Russia' },
  { code: 'ja-JP', region: 'Japan' },
  { code: 'ko-KR', region: 'South Korea' },
  { code: 'zh-CN', region: 'China' },
  { code: 'zh-TW', region: 'Taiwan' },
  { code: 'pl-PL', region: 'Poland' },
  { code: 'nl-NL', region: 'Netherlands' },
  { code: 'tr-TR', region: 'Turkey' },
  { code: 'ar-SA', region: 'Saudi Arabia' },
  { code: 'th-TH', region: 'Thailand' },
  { code: 'vi-VN', region: 'Vietnam' },
  { code: 'uk-UA', region: 'Ukraine' },
  { code: 'cs-CZ', region: 'Czech Republic' },
];

// Timezone with geolocation
const TIMEZONE_DATA: { [key: string]: { offset: number; lat: number; lng: number; city: string } } = {
  'America/New_York': { offset: -300, lat: 40.7128, lng: -74.0060, city: 'New York' },
  'America/Los_Angeles': { offset: -480, lat: 34.0522, lng: -118.2437, city: 'Los Angeles' },
  'America/Chicago': { offset: -360, lat: 41.8781, lng: -87.6298, city: 'Chicago' },
  'America/Denver': { offset: -420, lat: 39.7392, lng: -104.9903, city: 'Denver' },
  'America/Phoenix': { offset: -420, lat: 33.4484, lng: -112.0740, city: 'Phoenix' },
  'America/Toronto': { offset: -300, lat: 43.6532, lng: -79.3832, city: 'Toronto' },
  'America/Vancouver': { offset: -480, lat: 49.2827, lng: -123.1207, city: 'Vancouver' },
  'America/Mexico_City': { offset: -360, lat: 19.4326, lng: -99.1332, city: 'Mexico City' },
  'America/Sao_Paulo': { offset: -180, lat: -23.5505, lng: -46.6333, city: 'Sao Paulo' },
  'Europe/London': { offset: 0, lat: 51.5074, lng: -0.1278, city: 'London' },
  'Europe/Paris': { offset: 60, lat: 48.8566, lng: 2.3522, city: 'Paris' },
  'Europe/Berlin': { offset: 60, lat: 52.5200, lng: 13.4050, city: 'Berlin' },
  'Europe/Rome': { offset: 60, lat: 41.9028, lng: 12.4964, city: 'Rome' },
  'Europe/Madrid': { offset: 60, lat: 40.4168, lng: -3.7038, city: 'Madrid' },
  'Europe/Amsterdam': { offset: 60, lat: 52.3676, lng: 4.9041, city: 'Amsterdam' },
  'Europe/Moscow': { offset: 180, lat: 55.7558, lng: 37.6173, city: 'Moscow' },
  'Europe/Kiev': { offset: 120, lat: 50.4501, lng: 30.5234, city: 'Kyiv' },
  'Europe/Warsaw': { offset: 60, lat: 52.2297, lng: 21.0122, city: 'Warsaw' },
  'Europe/Prague': { offset: 60, lat: 50.0755, lng: 14.4378, city: 'Prague' },
  'Europe/Istanbul': { offset: 180, lat: 41.0082, lng: 28.9784, city: 'Istanbul' },
  'Asia/Tokyo': { offset: 540, lat: 35.6762, lng: 139.6503, city: 'Tokyo' },
  'Asia/Shanghai': { offset: 480, lat: 31.2304, lng: 121.4737, city: 'Shanghai' },
  'Asia/Hong_Kong': { offset: 480, lat: 22.3193, lng: 114.1694, city: 'Hong Kong' },
  'Asia/Singapore': { offset: 480, lat: 1.3521, lng: 103.8198, city: 'Singapore' },
  'Asia/Seoul': { offset: 540, lat: 37.5665, lng: 126.9780, city: 'Seoul' },
  'Asia/Bangkok': { offset: 420, lat: 13.7563, lng: 100.5018, city: 'Bangkok' },
  'Asia/Dubai': { offset: 240, lat: 25.2048, lng: 55.2708, city: 'Dubai' },
  'Asia/Kolkata': { offset: 330, lat: 22.5726, lng: 88.3639, city: 'Kolkata' },
  'Australia/Sydney': { offset: 600, lat: -33.8688, lng: 151.2093, city: 'Sydney' },
  'Australia/Melbourne': { offset: 600, lat: -37.8136, lng: 144.9631, city: 'Melbourne' },
  'Pacific/Auckland': { offset: 720, lat: -36.8485, lng: 174.7633, city: 'Auckland' },
};

const SCREEN_CONFIGS = [
  { width: 1920, height: 1080, dpr: 1 },
  { width: 1920, height: 1080, dpr: 1.25 },
  { width: 1920, height: 1080, dpr: 1.5 },
  { width: 1366, height: 768, dpr: 1 },
  { width: 1536, height: 864, dpr: 1.25 },
  { width: 1440, height: 900, dpr: 1 },
  { width: 1280, height: 720, dpr: 1 },
  { width: 2560, height: 1440, dpr: 1 },
  { width: 2560, height: 1440, dpr: 1.25 },
  { width: 1680, height: 1050, dpr: 1 },
  { width: 1600, height: 900, dpr: 1 },
  { width: 3840, height: 2160, dpr: 1.5 },
  { width: 3840, height: 2160, dpr: 2 },
  { width: 2880, height: 1800, dpr: 2 },
  { width: 1920, height: 1200, dpr: 1 },
];

// GPU configurations
const GPU_CONFIGS = [
  // Intel
  { vendor: 'Intel Inc.', unmasked: 'Intel', renderers: [
    'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Intel, Intel(R) Iris Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Intel, Intel(R) Iris Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Intel Iris OpenGL Engine',
    'Intel UHD Graphics 620 OpenGL Engine',
  ]},
  // NVIDIA
  { vendor: 'NVIDIA Corporation', unmasked: 'NVIDIA', renderers: [
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 2080 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  ]},
  // AMD
  { vendor: 'AMD', unmasked: 'AMD', renderers: [
    'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (AMD, AMD Radeon RX 5700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'AMD Radeon Pro 5500M OpenGL Engine',
    'AMD Radeon RX 580 Series',
  ]},
];

// WebGL extensions
const WEBGL_EXTENSIONS = [
  'ANGLE_instanced_arrays',
  'EXT_blend_minmax',
  'EXT_color_buffer_half_float',
  'EXT_disjoint_timer_query',
  'EXT_float_blend',
  'EXT_frag_depth',
  'EXT_shader_texture_lod',
  'EXT_texture_compression_bptc',
  'EXT_texture_compression_rgtc',
  'EXT_texture_filter_anisotropic',
  'EXT_sRGB',
  'KHR_parallel_shader_compile',
  'OES_element_index_uint',
  'OES_fbo_render_mipmap',
  'OES_standard_derivatives',
  'OES_texture_float',
  'OES_texture_float_linear',
  'OES_texture_half_float',
  'OES_texture_half_float_linear',
  'OES_vertex_array_object',
  'WEBGL_color_buffer_float',
  'WEBGL_compressed_texture_s3tc',
  'WEBGL_compressed_texture_s3tc_srgb',
  'WEBGL_debug_renderer_info',
  'WEBGL_debug_shaders',
  'WEBGL_depth_texture',
  'WEBGL_draw_buffers',
  'WEBGL_lose_context',
  'WEBGL_multi_draw',
];

// All fonts with frequency weight
const FONTS_DATABASE = [
  { name: 'Arial', weight: 100 },
  { name: 'Arial Black', weight: 90 },
  { name: 'Arial Narrow', weight: 60 },
  { name: 'Book Antiqua', weight: 50 },
  { name: 'Bookman Old Style', weight: 40 },
  { name: 'Calibri', weight: 95 },
  { name: 'Cambria', weight: 85 },
  { name: 'Cambria Math', weight: 70 },
  { name: 'Century', weight: 45 },
  { name: 'Century Gothic', weight: 55 },
  { name: 'Century Schoolbook', weight: 35 },
  { name: 'Comic Sans MS', weight: 80 },
  { name: 'Consolas', weight: 90 },
  { name: 'Courier', weight: 75 },
  { name: 'Courier New', weight: 95 },
  { name: 'Garamond', weight: 50 },
  { name: 'Georgia', weight: 90 },
  { name: 'Haettenschweiler', weight: 30 },
  { name: 'Helvetica', weight: 85 },
  { name: 'Impact', weight: 85 },
  { name: 'Lucida Console', weight: 75 },
  { name: 'Lucida Handwriting', weight: 40 },
  { name: 'Lucida Sans Unicode', weight: 70 },
  { name: 'Marlett', weight: 80 },
  { name: 'Microsoft Sans Serif', weight: 85 },
  { name: 'Monotype Corsiva', weight: 45 },
  { name: 'MS Gothic', weight: 55 },
  { name: 'MS PGothic', weight: 50 },
  { name: 'MS Reference Sans Serif', weight: 40 },
  { name: 'MS Sans Serif', weight: 70 },
  { name: 'MS Serif', weight: 65 },
  { name: 'Palatino Linotype', weight: 75 },
  { name: 'Segoe Print', weight: 50 },
  { name: 'Segoe Script', weight: 45 },
  { name: 'Segoe UI', weight: 98 },
  { name: 'Segoe UI Light', weight: 60 },
  { name: 'Segoe UI Semibold', weight: 55 },
  { name: 'Segoe UI Symbol', weight: 65 },
  { name: 'Symbol', weight: 80 },
  { name: 'Tahoma', weight: 90 },
  { name: 'Times', weight: 70 },
  { name: 'Times New Roman', weight: 95 },
  { name: 'Trebuchet MS', weight: 85 },
  { name: 'Verdana', weight: 95 },
  { name: 'Webdings', weight: 75 },
  { name: 'Wingdings', weight: 80 },
  { name: 'Wingdings 2', weight: 40 },
  { name: 'Wingdings 3', weight: 35 },
];

// Chrome plugins
const CHROME_PLUGINS: PluginConfig[] = [
  {
    name: 'PDF Viewer',
    description: 'Portable Document Format',
    filename: 'internal-pdf-viewer',
    mimeTypes: [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
      { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    ],
  },
  {
    name: 'Chrome PDF Viewer',
    description: 'Portable Document Format',
    filename: 'internal-pdf-viewer',
    mimeTypes: [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    ],
  },
  {
    name: 'Chromium PDF Viewer',
    description: 'Portable Document Format',
    filename: 'internal-pdf-viewer',
    mimeTypes: [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    ],
  },
  {
    name: 'Microsoft Edge PDF Viewer',
    description: 'Portable Document Format',
    filename: 'internal-pdf-viewer',
    mimeTypes: [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    ],
  },
  {
    name: 'WebKit built-in PDF',
    description: 'Portable Document Format',
    filename: 'internal-pdf-viewer',
    mimeTypes: [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    ],
  },
];

// Speech voices by language
const SPEECH_VOICES_DB: { [lang: string]: SpeechVoiceConfig[] } = {
  'en-US': [
    { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true, default: true, voiceURI: 'Microsoft David - English (United States)' },
    { name: 'Microsoft Mark - English (United States)', lang: 'en-US', localService: true, default: false, voiceURI: 'Microsoft Mark - English (United States)' },
    { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true, default: false, voiceURI: 'Microsoft Zira - English (United States)' },
    { name: 'Google US English', lang: 'en-US', localService: false, default: false, voiceURI: 'Google US English' },
  ],
  'en-GB': [
    { name: 'Microsoft Hazel - English (Great Britain)', lang: 'en-GB', localService: true, default: true, voiceURI: 'Microsoft Hazel - English (Great Britain)' },
    { name: 'Google UK English Female', lang: 'en-GB', localService: false, default: false, voiceURI: 'Google UK English Female' },
    { name: 'Google UK English Male', lang: 'en-GB', localService: false, default: false, voiceURI: 'Google UK English Male' },
  ],
  'de-DE': [
    { name: 'Microsoft Hedda - German', lang: 'de-DE', localService: true, default: true, voiceURI: 'Microsoft Hedda - German' },
    { name: 'Google Deutsch', lang: 'de-DE', localService: false, default: false, voiceURI: 'Google Deutsch' },
  ],
  'fr-FR': [
    { name: 'Microsoft Hortense - French', lang: 'fr-FR', localService: true, default: true, voiceURI: 'Microsoft Hortense - French' },
    { name: 'Google français', lang: 'fr-FR', localService: false, default: false, voiceURI: 'Google français' },
  ],
  'ru-RU': [
    { name: 'Microsoft Irina - Russian', lang: 'ru-RU', localService: true, default: true, voiceURI: 'Microsoft Irina - Russian' },
    { name: 'Google русский', lang: 'ru-RU', localService: false, default: false, voiceURI: 'Google русский' },
  ],
  'ja-JP': [
    { name: 'Microsoft Haruka - Japanese', lang: 'ja-JP', localService: true, default: true, voiceURI: 'Microsoft Haruka - Japanese' },
    { name: 'Google 日本語', lang: 'ja-JP', localService: false, default: false, voiceURI: 'Google 日本語' },
  ],
  'zh-CN': [
    { name: 'Microsoft Huihui - Chinese (Simplified)', lang: 'zh-CN', localService: true, default: true, voiceURI: 'Microsoft Huihui - Chinese (Simplified)' },
    { name: 'Google 普通话（中国大陆）', lang: 'zh-CN', localService: false, default: false, voiceURI: 'Google 普通话（中国大陆）' },
  ],
};

// Generator functions
function generateUserAgent(rng: SeededRandom, os: 'windows' | 'macos' | 'linux'): { userAgent: string; appVersion: string; chromeVersion: typeof CHROME_VERSIONS[0] } {
  const chromeVersion = rng.pickOne(CHROME_VERSIONS);
  const chromeStr = `${chromeVersion.major}.${chromeVersion.minor}.${chromeVersion.build}.${chromeVersion.patch}`;

  let osStr: string;
  let appVersion: string;

  switch (os) {
    case 'windows':
      const winVer = rng.pickOne(WINDOWS_VERSIONS);
      osStr = `Windows NT ${winVer}; Win64; x64`;
      appVersion = `5.0 (Windows NT ${winVer}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeStr} Safari/537.36`;
      break;
    case 'macos':
      const macVer = rng.pickOne(MACOS_VERSIONS);
      osStr = `Macintosh; Intel Mac OS X ${macVer}`;
      appVersion = `5.0 (Macintosh; Intel Mac OS X ${macVer}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeStr} Safari/537.36`;
      break;
    case 'linux':
      osStr = 'X11; Linux x86_64';
      appVersion = `5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeStr} Safari/537.36`;
      break;
  }

  const userAgent = `Mozilla/5.0 (${osStr}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeStr} Safari/537.36`;

  return { userAgent, appVersion, chromeVersion };
}

function generateScreen(rng: SeededRandom, customScreen?: { width: number; height: number } | null): ScreenConfig {
  let width: number;
  let height: number;
  let dpr: number;

  if (customScreen) {
    // Use custom screen resolution
    width = customScreen.width;
    height = customScreen.height;
    // Pick appropriate DPR based on resolution
    if (width >= 3840) {
      dpr = rng.pickOne([1.5, 2]);
    } else if (width >= 2560) {
      dpr = rng.pickOne([1, 1.25]);
    } else {
      dpr = rng.pickOne([1, 1.25, 1.5]);
    }
  } else {
    // Random screen config
    const config = rng.pickOne(SCREEN_CONFIGS);
    width = config.width;
    height = config.height;
    dpr = config.dpr;
  }

  const taskbarHeight = rng.nextInt(32, 48);

  return {
    width,
    height,
    availWidth: width,
    availHeight: height - taskbarHeight,
    colorDepth: rng.pickOne([24, 30, 32]),
    pixelDepth: rng.pickOne([24, 30, 32]),
    devicePixelRatio: dpr,
    orientation: 'landscape-primary',
    isExtended: rng.nextBool() && rng.nextBool(), // 25% chance
  };
}

function generateWebGL(rng: SeededRandom): WebGLConfig {
  const gpuConfig = rng.pickOne(GPU_CONFIGS);
  const renderer = rng.pickOne(gpuConfig.renderers);

  const numExtensions = rng.nextInt(20, WEBGL_EXTENSIONS.length);
  const extensions = rng.pickMany(WEBGL_EXTENSIONS, numExtensions);

  // Generate realistic WebGL parameters
  const maxTextureSize = rng.pickOne([4096, 8192, 16384, 32768]);

  return {
    vendor: 'Google Inc. (' + gpuConfig.unmasked + ')',
    renderer: 'ANGLE (' + gpuConfig.unmasked + ', ' + renderer + ')',
    unmaskedVendor: gpuConfig.vendor,
    unmaskedRenderer: renderer,
    version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)',
    shadingLanguageVersion: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)',
    maxTextureSize,
    maxVertexAttribs: rng.pickOne([16, 32]),
    maxVertexUniformVectors: rng.pickOne([256, 1024, 4096]),
    maxFragmentUniformVectors: rng.pickOne([256, 1024, 4096]),
    maxVaryingVectors: rng.pickOne([15, 16, 30, 32]),
    aliasedLineWidthRange: [1, rng.nextInt(1, 8)] as [number, number],
    aliasedPointSizeRange: [1, rng.pickOne([255, 1024, 8192])] as [number, number],
    maxViewportDims: [maxTextureSize, maxTextureSize] as [number, number],
    maxTextureImageUnits: rng.pickOne([16, 32]),
    maxCombinedTextureImageUnits: rng.pickOne([32, 80, 192]),
    maxVertexTextureImageUnits: rng.pickOne([16, 32]),
    maxRenderbufferSize: maxTextureSize,
    maxCubeMapTextureSize: rng.pickOne([4096, 8192, 16384]),
    supportedExtensions: extensions,
    noise: rng.nextFloat(0.0001, 0.001),
  };
}

function generateCanvas(rng: SeededRandom): CanvasConfig {
  return {
    noise: rng.nextFloat(0.0001, 0.001),
    hashSeed: rng.generateHex(32),
  };
}

function generateAudio(rng: SeededRandom): AudioConfig {
  return {
    noise: rng.nextFloat(0.00001, 0.0001),
    sampleRate: rng.pickOne([44100, 48000]),
    baseLatency: rng.nextFloat(0.005, 0.02),
    outputLatency: rng.nextFloat(0.01, 0.05),
    hashSeed: rng.generateHex(32),
  };
}

function generateMediaDevices(rng: SeededRandom): MediaDevicesConfig {
  const videoCount = rng.nextInt(0, 2);
  const audioInCount = rng.nextInt(1, 3);
  const audioOutCount = rng.nextInt(1, 3);

  return {
    videoinput: videoCount,
    audioinput: audioInCount,
    audiooutput: audioOutCount,
    deviceIds: {
      videoinput: Array.from({ length: videoCount }, () => rng.generateHex(64)),
      audioinput: Array.from({ length: audioInCount }, () => rng.generateHex(64)),
      audiooutput: Array.from({ length: audioOutCount }, () => rng.generateHex(64)),
    },
  };
}

function generateFonts(rng: SeededRandom): string[] {
  const numFonts = rng.nextInt(18, 35);
  const sortedFonts = [...FONTS_DATABASE].sort((a, b) => {
    // Weighted random selection
    const aScore = a.weight * rng.next();
    const bScore = b.weight * rng.next();
    return bScore - aScore;
  });

  return sortedFonts.slice(0, numFonts).map(f => f.name);
}

function generateGeolocation(rng: SeededRandom, timezone: string): GeolocationConfig {
  const tzData = TIMEZONE_DATA[timezone] || TIMEZONE_DATA['America/New_York'];

  // Add random offset within ~10km
  const latOffset = (rng.next() - 0.5) * 0.1;
  const lngOffset = (rng.next() - 0.5) * 0.1;

  return {
    enabled: true,
    latitude: tzData.lat + latOffset,
    longitude: tzData.lng + lngOffset,
    accuracy: rng.nextInt(10, 100),
  };
}

function generateBattery(rng: SeededRandom): BatteryConfig {
  const charging = rng.nextBool();
  const level = rng.nextFloat(0.2, 1.0);

  return {
    charging,
    chargingTime: charging ? rng.nextInt(0, 7200) : Infinity,
    dischargingTime: charging ? Infinity : rng.nextInt(3600, 36000),
    level: Math.round(level * 100) / 100,
  };
}

function generateConnection(rng: SeededRandom): ConnectionConfig {
  const effectiveTypes = ['4g', '3g'] as const;
  const types = ['wifi', 'ethernet'] as const;

  return {
    effectiveType: rng.pickOne([...effectiveTypes]),
    downlink: rng.pickOne([1.5, 2.5, 5, 10, 20, 50, 100]),
    rtt: rng.pickOne([50, 100, 150, 200, 300]),
    saveData: false,
    type: rng.pickOne([...types]),
  };
}

function generatePlugins(rng: SeededRandom): PluginConfig[] {
  // Chrome typically has 2-5 plugins
  const numPlugins = rng.nextInt(2, 5);
  return rng.pickMany(CHROME_PLUGINS, numPlugins);
}

function generateClientHints(rng: SeededRandom, os: 'windows' | 'macos' | 'linux', chromeVersion: typeof CHROME_VERSIONS[0]): ClientHintsConfig {
  const majorStr = chromeVersion.major.toString();
  const fullVersion = `${chromeVersion.major}.${chromeVersion.minor}.${chromeVersion.build}.${chromeVersion.patch}`;

  let platform: string;
  let platformVersion: string;

  switch (os) {
    case 'windows':
      platform = 'Windows';
      platformVersion = rng.pickOne(['10.0.0', '15.0.0']); // Windows 10 or 11
      break;
    case 'macos':
      platform = 'macOS';
      platformVersion = rng.pickOne(['13.0.0', '14.0.0', '14.1.0']);
      break;
    case 'linux':
      platform = 'Linux';
      platformVersion = rng.pickOne(['5.15.0', '6.1.0', '6.5.0']);
      break;
  }

  return {
    brands: [
      { brand: 'Not_A Brand', version: '8' },
      { brand: 'Chromium', version: majorStr },
      { brand: 'Google Chrome', version: majorStr },
    ],
    mobile: false,
    platform,
    platformVersion,
    architecture: 'x86',
    bitness: '64',
    model: '',
    fullVersionList: [
      { brand: 'Not_A Brand', version: '8.0.0.0' },
      { brand: 'Chromium', version: fullVersion },
      { brand: 'Google Chrome', version: fullVersion },
    ],
  };
}

function generateSpeechVoices(rng: SeededRandom, language: string): SpeechVoiceConfig[] {
  const voices: SpeechVoiceConfig[] = [];

  // Always include English voices
  if (SPEECH_VOICES_DB['en-US']) {
    voices.push(...rng.pickMany(SPEECH_VOICES_DB['en-US'], rng.nextInt(2, 4)));
  }

  // Add voices for the selected language
  const langKey = language.replace('_', '-');
  if (SPEECH_VOICES_DB[langKey] && langKey !== 'en-US') {
    voices.push(...SPEECH_VOICES_DB[langKey]);
  }

  // Add some random other language voices
  const otherLangs = Object.keys(SPEECH_VOICES_DB).filter(l => l !== 'en-US' && l !== langKey);
  const numOther = rng.nextInt(0, 3);
  for (let i = 0; i < numOther && i < otherLangs.length; i++) {
    const lang = rng.pickOne(otherLangs);
    if (SPEECH_VOICES_DB[lang]) {
      voices.push(rng.pickOne(SPEECH_VOICES_DB[lang]));
    }
  }

  return voices;
}

function generatePermissions(rng: SeededRandom): PermissionsConfig {
  const states = ['granted', 'denied', 'prompt'] as const;

  return {
    geolocation: rng.pickOne([...states]),
    notifications: rng.pickOne([...states]),
    camera: rng.pickOne(['denied', 'prompt'] as const),
    microphone: rng.pickOne(['denied', 'prompt'] as const),
    'persistent-storage': rng.pickOne(['granted', 'prompt'] as const),
    push: rng.pickOne([...states]),
    midi: rng.pickOne(['granted', 'prompt'] as const),
  };
}

function generateStorageQuota(rng: SeededRandom): StorageQuotaConfig {
  // Typical quota is based on disk size, usually 50-60% of available space
  const quotaGB = rng.pickOne([50, 100, 200, 500, 1000]);
  const usagePercent = rng.nextFloat(0.01, 0.15);

  return {
    quota: quotaGB * 1024 * 1024 * 1024,
    usage: Math.floor(quotaGB * 1024 * 1024 * 1024 * usagePercent),
  };
}

// Main fingerprint generator
// Screen resolution presets for UI
export const SCREEN_PRESETS = [
  { label: '1920×1080 (Full HD)', width: 1920, height: 1080 },
  { label: '1366×768 (HD)', width: 1366, height: 768 },
  { label: '1536×864', width: 1536, height: 864 },
  { label: '1440×900', width: 1440, height: 900 },
  { label: '1280×720 (HD)', width: 1280, height: 720 },
  { label: '2560×1440 (2K)', width: 2560, height: 1440 },
  { label: '1680×1050', width: 1680, height: 1050 },
  { label: '1600×900', width: 1600, height: 900 },
  { label: '3840×2160 (4K)', width: 3840, height: 2160 },
  { label: '2880×1800 (Retina)', width: 2880, height: 1800 },
  { label: '1920×1200', width: 1920, height: 1200 },
];

export interface GenerateFingerprintOptions {
  os?: 'windows' | 'macos' | 'linux';
  webrtcMode?: 'real' | 'disabled' | 'fake';
  screen?: {
    width: number;
    height: number;
  } | null; // null = random
}

export function generateFingerprint(options: GenerateFingerprintOptions = {}): Fingerprint {
  const { os = 'windows', webrtcMode = 'disabled', screen: customScreen } = options;

  // Generate unique seed
  const seed = uuidv4() + '-' + Date.now().toString(36) + '-' + Math.random().toString(36);
  const rng = new SeededRandom(seed);

  // Generate user agent and related
  const { userAgent, appVersion, chromeVersion } = generateUserAgent(rng, os);

  // Language
  const langData = rng.pickOne(LANGUAGES);
  const numLanguages = rng.nextInt(1, 4);
  const otherLangs = LANGUAGES.filter(l => l.code !== langData.code);
  const languages = [langData.code, ...rng.pickMany(otherLangs, numLanguages - 1).map(l => l.code)];

  // Timezone
  const timezones = Object.keys(TIMEZONE_DATA);
  const timezone = rng.pickOne(timezones);

  // Hardware
  const hardwareConcurrency = rng.pickOne([2, 4, 6, 8, 10, 12, 16, 20, 24, 32]);
  const deviceMemory = rng.pickOne([2, 4, 8, 16, 32]);

  // OS-specific properties
  let oscpu: string;
  let buildID: string;

  switch (os) {
    case 'windows':
      oscpu = `Windows NT ${rng.pickOne(WINDOWS_VERSIONS)}; Win64; x64`;
      buildID = '';
      break;
    case 'macos':
      oscpu = `Intel Mac OS X ${rng.pickOne(MACOS_VERSIONS)}`;
      buildID = '';
      break;
    case 'linux':
      oscpu = 'Linux x86_64';
      buildID = rng.generateHex(14);
      break;
  }

  return {
    seed,
    userAgent,
    platform: PLATFORMS[os],
    language: langData.code,
    languages,
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints: os === 'windows' ? rng.nextInt(0, 1) : 0,
    vendor: 'Google Inc.',
    vendorSub: '',
    product: 'Gecko',
    productSub: '20030107',
    appVersion,
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    oscpu,
    buildID,
    doNotTrack: rng.pickOne([null, '1']),
    cookieEnabled: true,
    pdfViewerEnabled: true,

    screen: generateScreen(rng, customScreen),
    webgl: generateWebGL(rng),
    canvas: generateCanvas(rng),
    audio: generateAudio(rng),
    timezone,
    fonts: generateFonts(rng),
    webrtc: {
      mode: webrtcMode,
      publicIp: null,
      localIps: [],
    },
    clientRectsNoise: rng.nextFloat(0.1, 2),
    mediaDevices: generateMediaDevices(rng),
    geolocation: generateGeolocation(rng, timezone),
    battery: generateBattery(rng),
    connection: generateConnection(rng),
    plugins: generatePlugins(rng),
    clientHints: generateClientHints(rng, os, chromeVersion),
    speechVoices: generateSpeechVoices(rng, langData.code),
    permissions: generatePermissions(rng),
    storageQuota: generateStorageQuota(rng),
    performanceNoise: rng.nextFloat(0.001, 0.01),
    mathNoise: rng.nextFloat(1e-15, 1e-13),
    timezoneOffsetNoise: 0, // Keep timezone accurate
    historyLength: rng.nextInt(1, 50),
  };
}

// Export for backward compatibility
export { generateUserAgent };
