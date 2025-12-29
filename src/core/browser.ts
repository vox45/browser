import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
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
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
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
  return path.join(userDataPath, 'profiles', profileId);
}

/**
 * Launch browser with profile
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

  // Browser launch options
  const launchOptions: any = {
    headless: false,
    executablePath: getChromiumPath(),
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--disable-features=CrossSiteDocumentBlockingIfIsolating',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--window-size=1920,1080',
      `--window-position=0,0`,
    ],
  };

  // Launch browser
  const browser = await chromium.launch(launchOptions);

  // Context options
  const contextOptions: any = {
    viewport: {
      width: profile.fingerprint.screen.width,
      height: profile.fingerprint.screen.height,
    },
    userAgent: profile.fingerprint.userAgent,
    locale: profile.fingerprint.language,
    timezoneId: profile.fingerprint.timezone,
    deviceScaleFactor: profile.fingerprint.screen.devicePixelRatio,
    storageState: path.join(profileDataDir, 'storage.json'),
  };

  // Add proxy if configured
  if (profile.proxy) {
    contextOptions.proxy = getPlaywrightProxy(profile.proxy);
  }

  // Check if storage state exists
  const storageStatePath = path.join(profileDataDir, 'storage.json');
  if (!fs.existsSync(storageStatePath)) {
    delete contextOptions.storageState;
  }

  // Create browser context
  const context = await browser.newContext(contextOptions);

  // Inject fingerprint script before any page loads
  const injectScript = generateInjectScript(profile.fingerprint);
  await context.addInitScript(injectScript);

  // Additional stealth
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

  // Open new page
  const page = await context.newPage();
  await page.goto('https://www.google.com');

  // Save storage state on close
  context.on('close', async () => {
    try {
      await context.storageState({ path: storageStatePath });
    } catch (e) {
      // Context may already be closed
    }
  });

  const instance: BrowserInstance = {
    profileId: profile.id,
    browser,
    context,
    pages: [page],
  };

  activeBrowsers.set(profile.id, instance);

  // Handle browser close
  browser.on('disconnected', () => {
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
    // Save storage state first
    const storageStatePath = path.join(getProfileDataDir(profileId), 'storage.json');
    await instance.context.storageState({ path: storageStatePath });
  } catch (e) {
    // Ignore storage save errors
  }

  try {
    await instance.browser.close();
  } catch (e) {
    // Browser may already be closed
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
 * Delete profile data
 */
export function deleteProfileData(profileId: string): void {
  const profileDataDir = getProfileDataDir(profileId);
  if (fs.existsSync(profileDataDir)) {
    fs.rmSync(profileDataDir, { recursive: true, force: true });
  }
}
