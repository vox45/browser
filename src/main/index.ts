import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  initDatabase,
  closeDatabase,
  getAllProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  updateLastUsed,
  clearAllProfiles,
  getProfilesDir,
  // Groups
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  // Templates
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  // Schedules
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  // Telegram
  getTelegramConfig,
  updateTelegramConfig,
  // Backup
  getBackupConfig,
  updateBackupConfig,
  createBackup,
  getBackupsList,
  restoreBackup,
  deleteBackup,
  getBackupsDir,
  // Export/Import
  exportProfile,
  exportAllProfiles,
  importProfile,
  importProfiles,
  // Bulk
  createBulkProfiles,
  deleteMultipleProfiles,
  // Stats
  incrementLaunchCount,
  addSessionTime,
  updateProfileStats,
  getAutoStartProfiles,
  clearAllData,
} from '../core/database';
import { Profile, ProxyConfig, ProfileGroup, ProfileTemplate, FarmingSchedule, TelegramConfig, BackupConfig, ProfileStats } from '../core/types';
import { generateFingerprint, GenerateFingerprintOptions } from '../fingerprint/generator';
import { launchBrowser, stopBrowser, isBrowserRunning, stopAllBrowsers, deleteProfileData, navigateToUrl } from '../core/browser';
import { testProxy, parseProxyString } from '../proxy/manager';
import { testTelegramConnection, notifyFarmingComplete, notifyFarmingError } from '../services/telegram';
import { startScheduler, stopScheduler, setFarmingHandler, getNextScheduledRun } from '../services/scheduler';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
const browserSessionStarts: Map<string, number> = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  initDatabase();
  createWindow();
  startScheduler();

  // Auto-start profiles
  const autoStartProfiles = getAutoStartProfiles();
  if (autoStartProfiles.length > 0) {
    console.log(`Auto-starting ${autoStartProfiles.length} profile(s)...`);
    for (const profile of autoStartProfiles) {
      try {
        await launchBrowser(profile);
        incrementLaunchCount(profile.id);
        browserSessionStarts.set(profile.id, Date.now());
        updateLastUsed(profile.id);
      } catch (e) {
        console.error(`Failed to auto-start profile ${profile.name}:`, e);
      }
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await stopAllBrowsers();
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  stopScheduler();
  // Track session times for running browsers
  for (const [profileId, startTime] of browserSessionStarts) {
    addSessionTime(profileId, Date.now() - startTime);
  }
  await stopAllBrowsers();
  closeDatabase();
});

// ==================== IPC Handlers ====================

// Get all profiles
ipcMain.handle('profile:list', async () => {
  try {
    const profiles = getAllProfiles();
    // Add running status
    return profiles.map(p => ({
      ...p,
      isRunning: isBrowserRunning(p.id),
    }));
  } catch (error: any) {
    return { error: error.message };
  }
});

// Get single profile
ipcMain.handle('profile:get', async (_, id: string) => {
  try {
    const profile = getProfile(id);
    if (profile) {
      return {
        ...profile,
        isRunning: isBrowserRunning(id),
      };
    }
    return null;
  } catch (error: any) {
    return { error: error.message };
  }
});

// Create profile
ipcMain.handle('profile:create', async (_, data: {
  name: string;
  os?: 'windows' | 'macos' | 'linux';
  proxy?: ProxyConfig | string;
  notes?: string;
  fingerprint?: Profile['fingerprint'];
  startHomepage?: boolean;
  homepageUrl?: string;
  group?: string;
  autoStart?: boolean;
}) => {
  try {
    const fingerprintOptions: GenerateFingerprintOptions = {
      os: data.os || 'windows',
    };

    let proxy: ProxyConfig | null = null;
    if (data.proxy) {
      if (typeof data.proxy === 'string') {
        proxy = parseProxyString(data.proxy);
      } else {
        proxy = data.proxy;
      }
    }

    // Use provided fingerprint or generate a new one
    const fingerprint = data.fingerprint || generateFingerprint(fingerprintOptions);

    const profile: Profile = {
      id: uuidv4(),
      name: data.name,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      fingerprint,
      proxy,
      notes: data.notes || '',
      startHomepage: data.startHomepage || false,
      homepageUrl: data.homepageUrl || 'https://www.google.com',
      group: data.group || '',
      autoStart: data.autoStart || false,
      stats: {
        launchCount: 0,
        totalTimeMs: 0,
        lastSessionStart: null,
        searchesCompleted: 0,
        dailySetsCompleted: 0,
      },
    };

    createProfile(profile);
    return profile;
  } catch (error: any) {
    return { error: error.message };
  }
});

// Update profile
ipcMain.handle('profile:update', async (_, data: Partial<Profile> & { id: string }) => {
  try {
    const existing = getProfile(data.id);
    if (!existing) {
      return { error: 'Profile not found' };
    }

    const updated: Profile = {
      ...existing,
      ...data,
      fingerprint: data.fingerprint || existing.fingerprint,
      proxy: data.proxy !== undefined ? data.proxy : existing.proxy,
    };

    updateProfile(updated);
    return updated;
  } catch (error: any) {
    return { error: error.message };
  }
});

// Delete profile
ipcMain.handle('profile:delete', async (_, id: string) => {
  try {
    // Stop browser if running
    if (isBrowserRunning(id)) {
      await stopBrowser(id);
    }

    // Delete from database
    deleteProfile(id);

    // Delete profile data (cookies, etc.)
    deleteProfileData(id);

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

// Launch browser
ipcMain.handle('profile:launch', async (_, id: string) => {
  try {
    const profile = getProfile(id);
    if (!profile) {
      return { error: 'Profile not found' };
    }

    await launchBrowser(profile);
    updateLastUsed(id);
    incrementLaunchCount(id);
    browserSessionStarts.set(id, Date.now());

    return { success: true };
  } catch (error: any) {
    console.error('Failed to launch browser:', error);
    return { error: error.message };
  }
});

// Stop browser
ipcMain.handle('profile:stop', async (_, id: string) => {
  try {
    // Track session time
    const startTime = browserSessionStarts.get(id);
    if (startTime) {
      addSessionTime(id, Date.now() - startTime);
      browserSessionStarts.delete(id);
    }

    const success = await stopBrowser(id);
    return { success };
  } catch (error: any) {
    return { error: error.message };
  }
});

// Generate new fingerprint
ipcMain.handle('fingerprint:generate', async (_, options?: GenerateFingerprintOptions) => {
  try {
    return generateFingerprint(options);
  } catch (error: any) {
    return { error: error.message };
  }
});

// Test proxy
ipcMain.handle('proxy:test', async (_, proxy: ProxyConfig | string) => {
  try {
    let proxyConfig: ProxyConfig;
    if (typeof proxy === 'string') {
      const parsed = parseProxyString(proxy);
      if (!parsed) {
        return { success: false, error: 'Invalid proxy format' };
      }
      proxyConfig = parsed;
    } else {
      proxyConfig = proxy;
    }

    const result = await testProxy(proxyConfig);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Browser status
ipcMain.handle('browser:status', async (_, id: string) => {
  return { isRunning: isBrowserRunning(id) };
});

// Open external link
ipcMain.handle('shell:openExternal', async (_, url: string) => {
  await shell.openExternal(url);
});

// Clear all data - delete all profiles and their browser data
ipcMain.handle('data:clearAll', async () => {
  try {
    // Stop all running browsers first
    await stopAllBrowsers();

    // Clear all profiles from database
    clearAllProfiles();

    // Delete all profile data directories
    const profilesDir = getProfilesDir();
    const fs = require('fs');
    if (fs.existsSync(profilesDir)) {
      fs.rmSync(profilesDir, { recursive: true, force: true });
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

// Navigate to URL in browser profile
ipcMain.handle('browser:navigate', async (_, id: string, url: string) => {
  try {
    if (!isBrowserRunning(id)) {
      return { error: 'Browser is not running' };
    }
    const success = await navigateToUrl(id, url);
    return { success };
  } catch (error: any) {
    return { error: error.message };
  }
});

// ==================== Farming Automation ====================
import { FarmingConfig, runSingleDailySetItem, runDesktopSearches, runMobileSearches, DAILY_SET_XPATHS } from '../automation/farming';
import { getBrowserContext } from '../core/browser';

let farmingAbortController: AbortController | null = null;
let isFarmingRunning = false;

// Start farming for selected profiles (each phase in separate browser session)
ipcMain.handle('farming:start', async (event, data: {
  profileIds: string[];
  config: {
    desktopSearches: number;
    mobileSearches: number;
    dailySet: boolean;
  };
  customQueries?: string[];
}) => {
  if (isFarmingRunning) {
    return { error: 'Farming is already running' };
  }

  const { profileIds, config, customQueries } = data;

  if (profileIds.length === 0) {
    return { error: 'No profiles selected' };
  }

  isFarmingRunning = true;
  farmingAbortController = new AbortController();

  const farmingConfig: FarmingConfig = {
    ...config,
    delayBetweenSearches: { min: 4000, max: 6000 },
    typingDelay: { min: 80, max: 120 },
  };

  // Send initial progress
  mainWindow?.webContents.send('farming:progress', {
    status: 'running',
    totalProfiles: profileIds.length,
    completedProfiles: 0,
    log: [`Starting farming for ${profileIds.length} profile(s)...`],
  });

  try {
    for (let i = 0; i < profileIds.length; i++) {
      if (farmingAbortController?.signal.aborted) {
        break;
      }

      const profileId = profileIds[i];
      const profile = getProfile(profileId);

      if (!profile) {
        mainWindow?.webContents.send('farming:progress', {
          log: [`Profile ${profileId} not found, skipping...`],
        });
        continue;
      }

      mainWindow?.webContents.send('farming:progress', {
        currentProfile: profileId,
        completedDesktop: 0,
        completedMobile: 0,
        dailySetCompleted: false,
        log: [`\n=== Profile ${i + 1}/${profileIds.length}: ${profile.name} ===`],
      });

      let dailySetCompleted = false;
      let desktopSearches = 0;
      let mobileSearches = 0;

      // Phase 1: Daily Set (EACH item in separate browser session)
      if (config.dailySet) {
        mainWindow?.webContents.send('farming:progress', {
          currentPhase: 'daily',
          log: ['[Phase 1] Daily Set - 3 items, each in separate browser session'],
        });

        let dailySetCount = 0;

        // Run each daily set item in its own browser session
        for (let itemIndex = 0; itemIndex < DAILY_SET_XPATHS.length; itemIndex++) {
          if (farmingAbortController?.signal.aborted) break;

          mainWindow?.webContents.send('farming:progress', {
            log: [`Daily Set ${itemIndex + 1}/3 - Opening browser...`],
          });

          try {
            await launchBrowser(profile);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const context = getBrowserContext(profileId);
            if (context) {
              const success = await runSingleDailySetItem(context, itemIndex, msg => {
                mainWindow?.webContents.send('farming:progress', { log: [msg] });
              });
              if (success) dailySetCount++;
            }

            mainWindow?.webContents.send('farming:progress', {
              log: [`Daily Set ${itemIndex + 1}/3 - Closing browser...`],
            });
            await stopBrowser(profileId);

            // Wait between daily set items
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error: any) {
            mainWindow?.webContents.send('farming:progress', {
              log: [`Daily Set ${itemIndex + 1} error: ${error.message}`],
            });
            try { await stopBrowser(profileId); } catch {}
          }
        }

        dailySetCompleted = dailySetCount > 0;
        mainWindow?.webContents.send('farming:progress', {
          dailySetCompleted,
          log: [`Daily Set completed: ${dailySetCount}/3 items`],
        });
      }

      if (farmingAbortController?.signal.aborted) break;

      // Phase 2: Desktop searches (separate browser session)
      if (config.desktopSearches > 0) {
        mainWindow?.webContents.send('farming:progress', {
          currentPhase: 'desktop',
          log: [`[Phase 2] Desktop searches (${config.desktopSearches}) - Opening browser...`],
        });

        try {
          await launchBrowser(profile);
          await new Promise(resolve => setTimeout(resolve, 3000));

          const context = getBrowserContext(profileId);
          if (context) {
            desktopSearches = await runDesktopSearches(
              context,
              config.desktopSearches,
              farmingConfig,
              customQueries,
              msg => {
                mainWindow?.webContents.send('farming:progress', { log: [msg] });
              },
              (completed, total) => {
                mainWindow?.webContents.send('farming:progress', {
                  completedDesktop: completed,
                });
              }
            );
          }

          mainWindow?.webContents.send('farming:progress', {
            log: ['Closing browser...'],
          });
          await stopBrowser(profileId);

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          mainWindow?.webContents.send('farming:progress', {
            log: [`Desktop search error: ${error.message}`],
          });
          try { await stopBrowser(profileId); } catch {}
        }
      }

      if (farmingAbortController?.signal.aborted) break;

      // Phase 3: Mobile searches (separate browser session)
      if (config.mobileSearches > 0) {
        mainWindow?.webContents.send('farming:progress', {
          currentPhase: 'mobile',
          log: [`[Phase 3] Mobile searches (${config.mobileSearches}) - Opening browser...`],
        });

        try {
          await launchBrowser(profile);
          await new Promise(resolve => setTimeout(resolve, 3000));

          const context = getBrowserContext(profileId);
          if (context) {
            mobileSearches = await runMobileSearches(
              context,
              config.mobileSearches,
              farmingConfig,
              customQueries,
              msg => {
                mainWindow?.webContents.send('farming:progress', { log: [msg] });
              },
              (completed, total) => {
                mainWindow?.webContents.send('farming:progress', {
                  completedMobile: completed,
                });
              }
            );
          }

          mainWindow?.webContents.send('farming:progress', {
            log: ['Closing browser...'],
          });
          await stopBrowser(profileId);
        } catch (error: any) {
          mainWindow?.webContents.send('farming:progress', {
            log: [`Mobile search error: ${error.message}`],
          });
          try { await stopBrowser(profileId); } catch {}
        }
      }

      // Profile completed
      mainWindow?.webContents.send('farming:progress', {
        completedProfiles: i + 1,
        log: [
          `\nProfile "${profile.name}" done:`,
          `  Daily Set: ${dailySetCompleted ? 'Yes' : 'No'}`,
          `  Desktop: ${desktopSearches}/${config.desktopSearches}`,
          `  Mobile: ${mobileSearches}/${config.mobileSearches}`,
        ],
      });

      // Wait between profiles
      if (i < profileIds.length - 1) {
        mainWindow?.webContents.send('farming:progress', {
          log: ['Waiting 5s before next profile...'],
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    mainWindow?.webContents.send('farming:progress', {
      status: 'completed',
      currentProfile: null,
      currentPhase: null,
      log: ['\n=== Farming session completed! ==='],
    });

    return { success: true };
  } catch (error: any) {
    mainWindow?.webContents.send('farming:progress', {
      status: 'error',
      error: error.message,
      log: [`Farming error: ${error.message}`],
    });
    return { error: error.message };
  } finally {
    isFarmingRunning = false;
    farmingAbortController = null;
  }
});

// Stop farming
ipcMain.handle('farming:stop', async () => {
  if (farmingAbortController) {
    farmingAbortController.abort();
  }
  isFarmingRunning = false;
  return { success: true };
});

// ==================== Groups ====================

ipcMain.handle('groups:list', async () => {
  try {
    return getAllGroups();
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('groups:create', async (_, data: { name: string; color: string }) => {
  try {
    const group: ProfileGroup = {
      id: uuidv4(),
      name: data.name,
      color: data.color,
      createdAt: new Date().toISOString(),
    };
    createGroup(group);
    return group;
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('groups:update', async (_, group: ProfileGroup) => {
  try {
    updateGroup(group);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('groups:delete', async (_, id: string) => {
  try {
    deleteGroup(id);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

// ==================== Templates ====================

ipcMain.handle('templates:list', async () => {
  try {
    return getAllTemplates();
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('templates:create', async (_, data: Omit<ProfileTemplate, 'id' | 'createdAt'>) => {
  try {
    const template: ProfileTemplate = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    createTemplate(template);
    return template;
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('templates:update', async (_, template: ProfileTemplate) => {
  try {
    updateTemplate(template);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('templates:delete', async (_, id: string) => {
  try {
    deleteTemplate(id);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

// ==================== Schedules ====================

ipcMain.handle('schedules:list', async () => {
  try {
    return getAllSchedules();
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('schedules:create', async (_, data: Omit<FarmingSchedule, 'id' | 'createdAt' | 'lastRun'>) => {
  try {
    const schedule: FarmingSchedule = {
      id: uuidv4(),
      ...data,
      lastRun: null,
      createdAt: new Date().toISOString(),
    };
    createSchedule(schedule);
    return schedule;
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('schedules:update', async (_, schedule: FarmingSchedule) => {
  try {
    updateSchedule(schedule);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('schedules:delete', async (_, id: string) => {
  try {
    deleteSchedule(id);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('schedules:nextRun', async () => {
  try {
    return getNextScheduledRun();
  } catch (error: any) {
    return { error: error.message };
  }
});

// ==================== Telegram ====================

ipcMain.handle('telegram:getConfig', async () => {
  try {
    return getTelegramConfig();
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('telegram:updateConfig', async (_, config: TelegramConfig) => {
  try {
    updateTelegramConfig(config);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('telegram:test', async (_, botToken: string, chatId: string) => {
  try {
    const success = await testTelegramConnection(botToken, chatId);
    return { success };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ==================== Backup ====================

ipcMain.handle('backup:getConfig', async () => {
  try {
    return getBackupConfig();
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('backup:updateConfig', async (_, config: BackupConfig) => {
  try {
    updateBackupConfig(config);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('backup:create', async () => {
  try {
    const backupPath = createBackup();
    return { success: true, path: backupPath };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('backup:list', async () => {
  try {
    return getBackupsList();
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('backup:restore', async (_, backupPath: string) => {
  try {
    const success = restoreBackup(backupPath);
    return { success };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('backup:delete', async (_, backupPath: string) => {
  try {
    const success = deleteBackup(backupPath);
    return { success };
  } catch (error: any) {
    return { error: error.message };
  }
});

// ==================== Export/Import ====================

ipcMain.handle('profile:export', async (_, id: string) => {
  try {
    const json = exportProfile(id);
    return { success: true, data: json };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('profile:exportAll', async () => {
  try {
    const json = exportAllProfiles();
    return { success: true, data: json };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('profile:import', async (_, json: string) => {
  try {
    const profile = importProfile(json);
    if (profile) {
      return { success: true, profile };
    }
    return { error: 'Failed to import profile' };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('profile:importMultiple', async (_, json: string) => {
  try {
    const profiles = importProfiles(json);
    return { success: true, count: profiles.length, profiles };
  } catch (error: any) {
    return { error: error.message };
  }
});

// ==================== Bulk Operations ====================

ipcMain.handle('profile:bulkCreate', async (_, data: {
  count: number;
  namePrefix: string;
  os: 'windows' | 'macos' | 'linux';
  group?: string;
  templateId?: string;
}) => {
  try {
    const profiles: Profile[] = [];
    let template: ProfileTemplate | null = null;

    if (data.templateId) {
      const templates = getAllTemplates();
      template = templates.find(t => t.id === data.templateId) || null;
    }

    for (let i = 1; i <= data.count; i++) {
      const fingerprint = generateFingerprint({ os: data.os });
      const profile: Profile = {
        id: uuidv4(),
        name: `${data.namePrefix} ${i}`,
        createdAt: new Date().toISOString(),
        lastUsed: null,
        fingerprint,
        proxy: template?.proxy || null,
        notes: '',
        startHomepage: template?.startHomepage || false,
        homepageUrl: template?.homepageUrl || 'https://www.google.com',
        group: data.group || template?.group || '',
        autoStart: template?.autoStart || false,
        stats: {
          launchCount: 0,
          totalTimeMs: 0,
          lastSessionStart: null,
          searchesCompleted: 0,
          dailySetsCompleted: 0,
        },
      };
      profiles.push(profile);
    }

    createBulkProfiles(profiles);
    return { success: true, count: profiles.length, profiles };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('profile:bulkDelete', async (_, ids: string[]) => {
  try {
    // Stop any running browsers
    for (const id of ids) {
      if (isBrowserRunning(id)) {
        await stopBrowser(id);
      }
      deleteProfileData(id);
    }
    deleteMultipleProfiles(ids);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

// ==================== Cookies ====================

ipcMain.handle('cookies:get', async (_, profileId: string) => {
  try {
    const profilesDir = getProfilesDir();
    const cookiesPath = path.join(profilesDir, profileId, 'Default', 'Cookies');

    if (!fs.existsSync(cookiesPath)) {
      return { cookies: [] };
    }

    // Cookies are in SQLite format, but we can't easily read them
    // Instead, return cookie files info
    return {
      path: cookiesPath,
      exists: true,
      message: 'Cookies are stored in Chromium format. Use browser DevTools to manage cookies.',
    };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('cookies:clear', async (_, profileId: string) => {
  try {
    const profilesDir = getProfilesDir();
    const cookiesPath = path.join(profilesDir, profileId, 'Default', 'Cookies');
    const cookiesJournalPath = path.join(profilesDir, profileId, 'Default', 'Cookies-journal');

    if (fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }
    if (fs.existsSync(cookiesJournalPath)) {
      fs.unlinkSync(cookiesJournalPath);
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});
