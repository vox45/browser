import { chromium, BrowserContext } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { Profile, BrowserInstance } from './types';
import { generateInjectScript } from '../fingerprint/inject';
import { getPlaywrightProxy } from '../proxy/manager';

// Store active browser instances
const activeBrowsers: Map<string, BrowserInstance> = new Map();

/**
 * Get Chromium executable path
 */
function getChromiumPath(): string {
  // Try to find system Chrome/Chromium
  const possiblePaths = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to Playwright's bundled Chromium
  return chromium.executablePath();
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
    timezoneId: profile.fingerprint.timezone,
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

  // Additional stealth scripts
  await context.addInitScript(() => {
    // Hide webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Chrome runtime
    (window as any).chrome = {
      runtime: {},
      loadTimes: () => ({}),
      csi: () => ({}),
      app: {},
    };

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
    await page.goto('https://www.google.com');
    pages = [page];
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

    // Handle chrome:// URLs - need to type in address bar since Playwright blocks them
    if (url.startsWith('chrome://')) {
      // Focus address bar and type URL
      await page.keyboard.press('Control+l'); // Focus address bar
      await page.waitForTimeout(100);
      await page.keyboard.type(url, { delay: 10 });
      await page.keyboard.press('Enter');
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
