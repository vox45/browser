import { chromium, BrowserContext } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { Profile, BrowserInstance } from './types';
import { generateInjectScript } from '../fingerprint/inject';
import { getPlaywrightProxy } from '../proxy/manager';

// Store active browser instances
const activeBrowsers: Map<string, BrowserInstance> = new Map();

// Valid IANA timezone IDs (subset for validation)
const VALID_TIMEZONES = new Set([
  'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
  'America/Phoenix', 'America/Toronto', 'America/Vancouver', 'America/Detroit',
  'America/Edmonton', 'America/Winnipeg', 'America/Mexico_City', 'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires', 'America/Lima', 'America/Bogota', 'America/Santiago',
  'America/Caracas', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
  'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Moscow', 'Europe/Kyiv', 'Europe/Warsaw',
  'Europe/Prague', 'Europe/Istanbul', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Brussels',
  'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Helsinki', 'Europe/Dublin',
  'Europe/Lisbon', 'Europe/Athens', 'Europe/Bucharest', 'Europe/Budapest', 'Europe/Sofia',
  'Europe/Belgrade', 'Europe/Zagreb', 'Europe/Riga', 'Europe/Vilnius', 'Europe/Tallinn',
  'Europe/Minsk', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore',
  'Asia/Seoul', 'Asia/Bangkok', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Jakarta',
  'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Ho_Chi_Minh', 'Asia/Taipei', 'Asia/Riyadh',
  'Asia/Jerusalem', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Karachi', 'Asia/Dhaka',
  'Asia/Yangon', 'Asia/Almaty', 'Asia/Tashkent', 'Australia/Sydney', 'Australia/Melbourne',
  'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide', 'Pacific/Auckland',
  'Pacific/Honolulu', 'Pacific/Fiji', 'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
  'Africa/Nairobi', 'Africa/Casablanca', 'Africa/Tunis', 'Africa/Algiers',
]);

/**
 * Validate timezone ID - returns valid timezone or fallback to America/New_York
 */
function validateTimezone(timezone: string): string {
  if (VALID_TIMEZONES.has(timezone)) {
    return timezone;
  }
  console.warn(`Invalid timezone "${timezone}", falling back to America/New_York`);
  return 'America/New_York';
}

/**
 * Get Chromium executable path - prioritize Chromium over Chrome
 */
function getChromiumPath(): string {
  // Try to find system Chromium first, then Chrome as fallback
  const possiblePaths = [
    // Linux - Chromium first
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // Linux - Chrome fallback
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    // macOS - Chromium first
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // macOS - Chrome fallback
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Windows - Chromium first (common locations)
    process.env.LOCALAPPDATA + '\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
    // Windows - Chrome fallback
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      console.log('Using browser:', p);
      return p;
    }
  }

  // Fallback to Playwright's bundled Chromium
  const playwrightChromium = chromium.executablePath();
  console.log('Using Playwright bundled Chromium:', playwrightChromium);
  return playwrightChromium;
}

/**
 * Get profile data directory
 */
function getProfileDataDir(profileId: string): string {
  const userDataPath = app?.getPath('userData') || process.cwd();
  return path.join(userDataPath, 'browser_profiles', profileId);
}

/**
 * Launch browser with profile - uses persistent context to save all data
 */
export async function launchBrowser(profile: Profile): Promise<BrowserInstance> {
  // Check if already running
  if (activeBrowsers.has(profile.id)) {
    const existing = activeBrowsers.get(profile.id)!;
    // Try to bring to front
    const pages = existing.context.pages();
    if (pages.length > 0) {
      await pages[0].bringToFront();
    }
    return existing;
  }

  const profileDataDir = getProfileDataDir(profile.id);

  // Ensure profile directory exists
  if (!fs.existsSync(profileDataDir)) {
    fs.mkdirSync(profileDataDir, { recursive: true });
  }

  // Prepare geolocation if enabled
  const geolocation = profile.fingerprint.geolocation?.enabled
    ? {
        latitude: profile.fingerprint.geolocation.latitude,
        longitude: profile.fingerprint.geolocation.longitude,
        accuracy: profile.fingerprint.geolocation.accuracy,
      }
    : undefined;

  // Use launchPersistentContext to save ALL browser data (cookies, localStorage, cache, etc.)
  const context = await chromium.launchPersistentContext(profileDataDir, {
    headless: false,
    executablePath: getChromiumPath(),
    viewport: {
      width: profile.fingerprint.screen.width,
      height: profile.fingerprint.screen.height,
    },
    userAgent: profile.fingerprint.userAgent,
    locale: profile.fingerprint.language,
    timezoneId: validateTimezone(profile.fingerprint.timezone),
    deviceScaleFactor: profile.fingerprint.screen.devicePixelRatio,
    proxy: profile.proxy ? getPlaywrightProxy(profile.proxy) : undefined,
    geolocation,
    permissions: geolocation ? ['geolocation'] : [],
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      `--window-size=${profile.fingerprint.screen.width},${profile.fingerprint.screen.height}`,
    ],
    // Ignore Playwright default args that break chrome:// pages
    ignoreDefaultArgs: [
      '--enable-automation',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
    ],
  });

  // Inject fingerprint script before any page loads
  const injectScript = generateInjectScript(profile.fingerprint);
  await context.addInitScript(injectScript);

  // Additional stealth scripts - skip on chrome:// pages
  await context.addInitScript(() => {
    // Skip injection on chrome:// pages - they need original APIs
    if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') {
      return;
    }

    // Hide webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Chrome runtime - only add missing properties, don't overwrite
    if (!(window as any).chrome) {
      (window as any).chrome = {};
    }
    if (!(window as any).chrome.runtime) {
      (window as any).chrome.runtime = {};
    }
    if (!(window as any).chrome.loadTimes) {
      (window as any).chrome.loadTimes = () => ({});
    }
    if (!(window as any).chrome.csi) {
      (window as any).chrome.csi = () => ({});
    }

    // Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission } as PermissionStatus);
      }
      return originalQuery(parameters);
    };
  });

  // Get existing pages or create new one
  let pages = context.pages();
  if (pages.length === 0) {
    const page = await context.newPage();
    pages = [page];
  }

  // Navigate to homepage if enabled, otherwise blank tab
  if (profile.startHomepage && profile.homepageUrl) {
    try {
      await pages[0].goto(profile.homepageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.error('Failed to navigate to homepage:', e);
    }
  }

  const instance: BrowserInstance = {
    profileId: profile.id,
    browser: null as any, // persistent context doesn't have separate browser
    context,
    pages,
  };

  activeBrowsers.set(profile.id, instance);

  // Handle context close
  context.on('close', () => {
    activeBrowsers.delete(profile.id);
  });

  return instance;
}

/**
 * Stop browser instance
 */
export async function stopBrowser(profileId: string): Promise<boolean> {
  const instance = activeBrowsers.get(profileId);
  if (!instance) {
    return false;
  }

  try {
    await instance.context.close();
  } catch (e) {
    // Context may already be closed
  }

  activeBrowsers.delete(profileId);
  return true;
}

/**
 * Check if browser is running
 */
export function isBrowserRunning(profileId: string): boolean {
  return activeBrowsers.has(profileId);
}

/**
 * Get browser context for profile (used by farming automation)
 */
export function getBrowserContext(profileId: string): BrowserContext | null {
  const instance = activeBrowsers.get(profileId);
  return instance?.context || null;
}

/**
 * Get all running browsers
 */
export function getRunningBrowsers(): string[] {
  return Array.from(activeBrowsers.keys());
}

/**
 * Stop all browsers
 */
export async function stopAllBrowsers(): Promise<void> {
  const promises = Array.from(activeBrowsers.keys()).map(id => stopBrowser(id));
  await Promise.all(promises);
}

/**
 * Navigate to URL in running browser
 */
export async function navigateToUrl(profileId: string, url: string): Promise<boolean> {
  const instance = activeBrowsers.get(profileId);
  if (!instance) {
    return false;
  }

  try {
    const pages = instance.context.pages();
    let page = pages.length > 0 ? pages[0] : await instance.context.newPage();
    await page.bringToFront();

    // Handle chrome:// URLs using CDP (Chrome DevTools Protocol)
    if (url.startsWith('chrome://')) {
      const cdp = await instance.context.newCDPSession(page);
      await cdp.send('Page.navigate', { url });
      await cdp.detach();
      return true;
    }

    await page.goto(url);
    return true;
  } catch (e) {
    console.error('Failed to navigate:', e);
    return false;
  }
}

/**
 * Delete profile data
 */
export function deleteProfileData(profileId: string): void {
  const profileDataDir = getProfileDataDir(profileId);
  if (fs.existsSync(profileDataDir)) {
    fs.rmSync(profileDataDir, { recursive: true, force: true });
  }
}
