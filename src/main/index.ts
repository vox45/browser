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
} from '../core/database';
import { Profile, ProxyConfig } from '../core/types';
import { generateFingerprint, GenerateFingerprintOptions } from '../fingerprint/generator';
import { launchBrowser, stopBrowser, isBrowserRunning, stopAllBrowsers, deleteProfileData, navigateToUrl } from '../core/browser';
import { testProxy, parseProxyString } from '../proxy/manager';

let mainWindow: BrowserWindow | null = null;

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
app.whenReady().then(() => {
  initDatabase();
  createWindow();

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

    return { success: true };
  } catch (error: any) {
    console.error('Failed to launch browser:', error);
    return { error: error.message };
  }
});

// Stop browser
ipcMain.handle('profile:stop', async (_, id: string) => {
  try {
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
