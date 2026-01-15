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
import { farmBingRewards, FarmingConfig, FarmingProgress } from '../automation/farming';
import { getBrowserContext } from '../core/browser';

let farmingAbortController: AbortController | null = null;
let isFarmingRunning = false;

// Start farming for selected profiles
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
    delayBetweenSearches: { min: 4000, max: 8000 },
    typingDelay: { min: 50, max: 150 },
  };

  // Send initial progress
  mainWindow?.webContents.send('farming:progress', {
    status: 'running',
    totalProfiles: profileIds.length,
    completedProfiles: 0,
    log: [`Starting farming for ${profileIds.length} profiles...`],
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
        log: [`Starting farming for profile: ${profile.name}`],
      });

      // Launch browser for this profile
      try {
        await launchBrowser(profile);

        // Wait for browser to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));

        const context = getBrowserContext(profileId);
        if (!context) {
          mainWindow?.webContents.send('farming:progress', {
            log: [`Failed to get browser context for ${profile.name}`],
          });
          continue;
        }

        // Run farming
        const result = await farmBingRewards(
          context,
          farmingConfig,
          customQueries,
          (progress) => {
            mainWindow?.webContents.send('farming:progress', progress);
          }
        );

        // Update result with profile info
        result.profileId = profileId;
        result.profileName = profile.name;

        mainWindow?.webContents.send('farming:progress', {
          completedProfiles: i + 1,
          log: [
            `Completed ${profile.name}: ${result.desktopSearches} desktop, ${result.mobileSearches} mobile searches`,
            result.dailySetCompleted ? 'Daily set completed' : 'Daily set not completed',
          ],
        });

        // Close browser after farming
        await stopBrowser(profileId);

        // Wait between profiles
        if (i < profileIds.length - 1) {
          mainWindow?.webContents.send('farming:progress', {
            log: ['Waiting before next profile...'],
          });
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (error: any) {
        mainWindow?.webContents.send('farming:progress', {
          log: [`Error farming ${profile.name}: ${error.message}`],
        });
        // Try to stop browser on error
        try {
          await stopBrowser(profileId);
        } catch {
          // Ignore
        }
      }
    }

    mainWindow?.webContents.send('farming:progress', {
      status: 'completed',
      currentProfile: null,
      log: ['Farming session completed!'],
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
