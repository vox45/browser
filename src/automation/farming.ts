import { BrowserContext, Page } from 'playwright-core';

// Mobile Chrome versions for farming
const MOBILE_CHROME_VERSIONS = [
  { major: 120, minor: 0, build: 6099, patch: 230 },
  { major: 125, minor: 0, build: 6422, patch: 165 },
  { major: 130, minor: 0, build: 6723, patch: 102 },
  { major: 131, minor: 0, build: 6778, patch: 96 },
];

// Android devices for mobile emulation
const ANDROID_DEVICES = [
  { name: 'SM-G991B', model: 'Samsung Galaxy S21', width: 360, height: 800 },
  { name: 'Pixel 7', model: 'Google Pixel 7', width: 412, height: 915 },
  { name: 'Pixel 8', model: 'Google Pixel 8', width: 412, height: 915 },
  { name: 'SM-A546B', model: 'Samsung Galaxy A54', width: 360, height: 800 },
];

const ANDROID_VERSIONS = ['12', '13', '14'];

// Generate mobile user agent
export function generateMobileUserAgent(): {
  userAgent: string;
  device: typeof ANDROID_DEVICES[0];
  viewport: { width: number; height: number };
} {
  const chromeVersion = MOBILE_CHROME_VERSIONS[Math.floor(Math.random() * MOBILE_CHROME_VERSIONS.length)];
  const androidVersion = ANDROID_VERSIONS[Math.floor(Math.random() * ANDROID_VERSIONS.length)];
  const device = ANDROID_DEVICES[Math.floor(Math.random() * ANDROID_DEVICES.length)];
  const chromeStr = `${chromeVersion.major}.${chromeVersion.minor}.${chromeVersion.build}.${chromeVersion.patch}`;

  const userAgent = `Mozilla/5.0 (Linux; Android ${androidVersion}; ${device.name}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeStr} Mobile Safari/537.36`;

  return {
    userAgent,
    device,
    viewport: { width: device.width, height: device.height },
  };
}

// Default search queries for Bing farming
const DEFAULT_QUERIES = [
  'weather today', 'latest news', 'best movies 2024', 'top songs', 'stock market today',
  'recipe ideas', 'travel destinations', 'fitness tips', 'technology news', 'sports scores',
  'how to learn programming', 'best smartphones 2024', 'healthy recipes', 'gaming news',
  'movie reviews', 'book recommendations', 'home improvement tips', 'car reviews',
  'fashion trends', 'science news', 'history facts', 'art museums', 'music festivals',
  'pet care tips', 'gardening advice', 'cooking techniques', 'workout routines',
  'meditation benefits', 'language learning apps', 'photography tips', 'video editing',
  'podcast recommendations', 'streaming services', 'smart home devices', 'electric cars',
  'climate change', 'space exploration', 'artificial intelligence', 'virtual reality',
  'cybersecurity tips', 'remote work tools', 'productivity apps', 'online courses',
  'investment strategies', 'cryptocurrency news', 'real estate market', 'job search tips',
  'interview preparation', 'resume writing', 'salary negotiation', 'career advice',
  'mental health tips', 'stress management', 'sleep improvement', 'nutrition advice',
  'weight loss tips', 'muscle building', 'yoga poses', 'running tips', 'cycling routes',
  'hiking trails', 'camping gear', 'fishing spots', 'hunting regulations', 'bird watching',
  'astronomy basics', 'chemistry experiments', 'physics concepts', 'math problems',
  'english grammar', 'spanish vocabulary', 'french phrases', 'german words',
  'japanese characters', 'chinese culture', 'korean music', 'indian cuisine',
  'mexican food', 'italian pasta', 'greek mythology', 'roman history',
  'world war history', 'ancient civilizations', 'medieval times', 'renaissance art',
  'modern architecture', 'interior design', 'landscape photography', 'portrait tips',
  'digital marketing', 'social media strategy', 'content creation', 'brand building',
  'startup ideas', 'business planning', 'financial planning', 'tax preparation',
  'insurance options', 'retirement planning', 'estate planning', 'legal advice',
  'immigration process', 'visa requirements', 'passport renewal', 'travel insurance',
  'flight booking', 'hotel deals', 'car rental', 'cruise vacations', 'beach resorts',
  'mountain retreats', 'city tours', 'cultural experiences', 'adventure sports',
  'water activities', 'winter sports', 'summer activities', 'spring festivals',
];

export interface FarmingConfig {
  desktopSearches: number;
  mobileSearches: number;
  dailySet: boolean;
  delayBetweenSearches: { min: number; max: number };
  typingDelay: { min: number; max: number };
}

export interface FarmingProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentProfile: string | null;
  currentPhase: 'desktop' | 'mobile' | 'daily' | null;
  completedDesktop: number;
  completedMobile: number;
  dailySetCompleted: boolean;
  totalProfiles: number;
  completedProfiles: number;
  error: string | null;
  log?: string[];
}

export interface FarmingResult {
  profileId: string;
  profileName: string;
  desktopSearches: number;
  mobileSearches: number;
  dailySetCompleted: boolean;
  error: string | null;
}

// Random delay helper
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Shuffle array helper
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Get random queries from the list
function getRandomQueries(count: number, customQueries?: string[]): string[] {
  const pool = customQueries && customQueries.length > 0 ? customQueries : DEFAULT_QUERIES;
  const shuffled = shuffle(pool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Type text character by character with random delays
async function typeText(page: Page, selector: string, text: string, config: FarmingConfig): Promise<void> {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  await element.click();
  await element.fill('');

  for (const char of text) {
    await page.keyboard.type(char, { delay: 0 });
    await sleep(randomDelay(config.typingDelay.min, config.typingDelay.max));
  }
}

// Perform a single Bing search
async function performBingSearch(
  page: Page,
  query: string,
  config: FarmingConfig,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  try {
    onProgress?.(`Searching: ${query}`);

    // Navigate to Bing
    await page.goto('https://www.bing.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(randomDelay(1500, 2500));

    // Find search input
    const searchInput = await page.$('#sb_form_q');
    if (!searchInput) {
      const altInput = await page.$('input[name="q"]');
      if (!altInput) {
        onProgress?.('Search input not found, trying direct URL');
        await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
        await sleep(randomDelay(config.delayBetweenSearches.min, config.delayBetweenSearches.max));
        return true;
      }
    }

    // Type the query
    await typeText(page, '#sb_form_q', query, config);
    await sleep(randomDelay(200, 500));

    // Press Enter
    await page.keyboard.press('Enter');
    await sleep(randomDelay(config.delayBetweenSearches.min, config.delayBetweenSearches.max));

    return true;
  } catch (error: any) {
    onProgress?.(`Search error: ${error.message}`);
    return false;
  }
}

// XPaths for daily set items (from original program - 3 items)
const DAILY_SET_XPATHS = [
  '//*[@id="daily-sets"]/mee-card-group[1]/div/mee-card[1]/div/card-content/mee-rewards-daily-set-item-content/div/a',
  '//*[@id="daily-sets"]/mee-card-group[1]/div/mee-card[2]/div/card-content/mee-rewards-daily-set-item-content/div/a',
  '//*[@id="daily-sets"]/mee-card-group[1]/div/mee-card[3]/div/card-content/mee-rewards-daily-set-item-content/div/a',
];

/**
 * Phase 1: Daily Set collection (runs in separate browser session)
 */
export async function runDailySet(
  context: BrowserContext,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  let page: Page | null = null;

  try {
    onProgress?.('Opening browser for Daily Set...');
    page = await context.newPage();

    // Navigate to rewards page
    await page.goto('https://rewards.bing.com/', { waitUntil: 'networkidle', timeout: 45000 });
    await sleep(randomDelay(3000, 5000));

    // Check if logged in
    const signInButton = await page.$('a[href*="login"], a[href*="signin"], .sign-in-link');
    if (signInButton) {
      const isVisible = await signInButton.isVisible().catch(() => false);
      if (isVisible) {
        onProgress?.('Not logged in to Microsoft Rewards');
        return false;
      }
    }

    let completedCount = 0;

    // Click each daily set item using XPath (all 3)
    for (let i = 0; i < DAILY_SET_XPATHS.length; i++) {
      const xpath = DAILY_SET_XPATHS[i];
      onProgress?.(`Clicking daily set item ${i + 1}/3...`);

      try {
        const element = await page.waitForSelector(`xpath=${xpath}`, { timeout: 10000 }).catch(() => null);

        if (element) {
          await page.evaluate((el) => (el as HTMLElement).click(), element);
          completedCount++;

          await sleep(randomDelay(3000, 4000));

          // Handle new tabs if opened
          const pages = page.context().pages();
          if (pages.length > 1) {
            await sleep(randomDelay(2000, 3000));
            for (let j = pages.length - 1; j > 0; j--) {
              await pages[j].close().catch(() => {});
            }
          }

          // Go back to rewards page if navigated away
          if (!page.url().includes('rewards.bing.com')) {
            await page.goto('https://rewards.bing.com/', { waitUntil: 'networkidle', timeout: 30000 });
            await sleep(randomDelay(2000, 3000));
          }
        } else {
          onProgress?.(`Daily set item ${i + 1} not found`);
        }
      } catch (err: any) {
        onProgress?.(`Daily set item ${i + 1} error: ${err.message}`);
      }
    }

    onProgress?.(`Daily Set completed: ${completedCount}/3 items`);
    return completedCount > 0;
  } catch (error: any) {
    onProgress?.(`Daily Set error: ${error.message}`);
    return false;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Phase 2: Desktop searches (runs in separate browser session)
 */
export async function runDesktopSearches(
  context: BrowserContext,
  count: number,
  config: FarmingConfig,
  customQueries?: string[],
  onProgress?: (msg: string) => void,
  onSearchComplete?: (completed: number, total: number) => void
): Promise<number> {
  let page: Page | null = null;
  let completedSearches = 0;

  try {
    onProgress?.(`Opening browser for ${count} desktop searches...`);
    page = await context.newPage();

    const queries = getRandomQueries(count, customQueries);

    for (let i = 0; i < queries.length; i++) {
      const success = await performBingSearch(page, queries[i], config, onProgress);
      if (success) {
        completedSearches++;
        onSearchComplete?.(completedSearches, count);
      }
    }

    onProgress?.(`Desktop searches completed: ${completedSearches}/${count}`);
    return completedSearches;
  } catch (error: any) {
    onProgress?.(`Desktop search error: ${error.message}`);
    return completedSearches;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Phase 3: Mobile searches (runs in separate browser session with mobile emulation)
 */
export async function runMobileSearches(
  context: BrowserContext,
  count: number,
  config: FarmingConfig,
  customQueries?: string[],
  onProgress?: (msg: string) => void,
  onSearchComplete?: (completed: number, total: number) => void
): Promise<number> {
  let page: Page | null = null;
  let completedSearches = 0;

  try {
    const mobileUA = generateMobileUserAgent();
    onProgress?.(`Opening browser for ${count} mobile searches (${mobileUA.device.model})...`);

    page = await context.newPage();
    await page.setViewportSize(mobileUA.viewport);
    await page.setExtraHTTPHeaders({
      'User-Agent': mobileUA.userAgent,
    });

    const queries = getRandomQueries(count, customQueries);

    for (let i = 0; i < queries.length; i++) {
      const success = await performBingSearch(page, queries[i], config, onProgress);
      if (success) {
        completedSearches++;
        onSearchComplete?.(completedSearches, count);
      }
    }

    onProgress?.(`Mobile searches completed: ${completedSearches}/${count}`);
    return completedSearches;
  } catch (error: any) {
    onProgress?.(`Mobile search error: ${error.message}`);
    return completedSearches;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

// Export default queries for UI
export { DEFAULT_QUERIES };
