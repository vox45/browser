import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Profile, Fingerprint, ProxyConfig, ProfileGroup, ProfileTemplate, FarmingSchedule, TelegramConfig, BackupConfig } from '../core/types';

// Farming progress callback storage
const farmingProgressCallbacks = new Set<(event: IpcRendererEvent, data: any) => void>();

// Expose API to renderer
contextBridge.exposeInMainWorld('api', {
  // Profiles
  getProfiles: () => ipcRenderer.invoke('profile:list'),
  getProfile: (id: string) => ipcRenderer.invoke('profile:get', id),
  createProfile: (data: any) => ipcRenderer.invoke('profile:create', data),
  updateProfile: (data: Partial<Profile> & { id: string }) => ipcRenderer.invoke('profile:update', data),
  deleteProfile: (id: string) => ipcRenderer.invoke('profile:delete', id),

  // Browser
  launchBrowser: (id: string) => ipcRenderer.invoke('profile:launch', id),
  stopBrowser: (id: string) => ipcRenderer.invoke('profile:stop', id),
  getBrowserStatus: (id: string) => ipcRenderer.invoke('browser:status', id),
  navigateToUrl: (id: string, url: string) => ipcRenderer.invoke('browser:navigate', id, url),

  // Fingerprint
  generateFingerprint: (options?: { os?: string; screen?: { width: number; height: number } | null }) =>
    ipcRenderer.invoke('fingerprint:generate', options),

  // Proxy
  testProxy: (proxy: ProxyConfig | string) => ipcRenderer.invoke('proxy:test', proxy),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Data management
  clearAllData: () => ipcRenderer.invoke('data:clearAll'),

  // Farming Automation
  startFarming: (data: any) => ipcRenderer.invoke('farming:start', data),
  stopFarming: () => ipcRenderer.invoke('farming:stop'),
  onFarmingProgress: (callback: (event: IpcRendererEvent, data: any) => void) => {
    farmingProgressCallbacks.add(callback);
    ipcRenderer.on('farming:progress', callback);
  },
  offFarmingProgress: (callback: (event: IpcRendererEvent, data: any) => void) => {
    farmingProgressCallbacks.delete(callback);
    ipcRenderer.off('farming:progress', callback);
  },

  // Groups
  getGroups: () => ipcRenderer.invoke('groups:list'),
  createGroup: (data: { name: string; color: string }) => ipcRenderer.invoke('groups:create', data),
  updateGroup: (group: ProfileGroup) => ipcRenderer.invoke('groups:update', group),
  deleteGroup: (id: string) => ipcRenderer.invoke('groups:delete', id),

  // Templates
  getTemplates: () => ipcRenderer.invoke('templates:list'),
  createTemplate: (data: any) => ipcRenderer.invoke('templates:create', data),
  updateTemplate: (template: ProfileTemplate) => ipcRenderer.invoke('templates:update', template),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),

  // Schedules
  getSchedules: () => ipcRenderer.invoke('schedules:list'),
  createSchedule: (data: any) => ipcRenderer.invoke('schedules:create', data),
  updateSchedule: (schedule: FarmingSchedule) => ipcRenderer.invoke('schedules:update', schedule),
  deleteSchedule: (id: string) => ipcRenderer.invoke('schedules:delete', id),
  getNextScheduledRun: () => ipcRenderer.invoke('schedules:nextRun'),

  // Telegram
  getTelegramConfig: () => ipcRenderer.invoke('telegram:getConfig'),
  updateTelegramConfig: (config: TelegramConfig) => ipcRenderer.invoke('telegram:updateConfig', config),
  testTelegram: (botToken: string, chatId: string) => ipcRenderer.invoke('telegram:test', botToken, chatId),

  // Backup
  getBackupConfig: () => ipcRenderer.invoke('backup:getConfig'),
  updateBackupConfig: (config: BackupConfig) => ipcRenderer.invoke('backup:updateConfig', config),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  getBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: (path: string) => ipcRenderer.invoke('backup:restore', path),
  deleteBackup: (path: string) => ipcRenderer.invoke('backup:delete', path),

  // Export/Import
  exportProfile: (id: string) => ipcRenderer.invoke('profile:export', id),
  exportAllProfiles: () => ipcRenderer.invoke('profile:exportAll'),
  importProfile: (json: string) => ipcRenderer.invoke('profile:import', json),
  importProfiles: (json: string) => ipcRenderer.invoke('profile:importMultiple', json),

  // Bulk operations
  bulkCreateProfiles: (data: any) => ipcRenderer.invoke('profile:bulkCreate', data),
  bulkDeleteProfiles: (ids: string[]) => ipcRenderer.invoke('profile:bulkDelete', ids),

  // Cookies
  getCookies: (profileId: string) => ipcRenderer.invoke('cookies:get', profileId),
  clearCookies: (profileId: string) => ipcRenderer.invoke('cookies:clear', profileId),

  // Query Management
  getQueryStats: () => ipcRenderer.invoke('queries:stats'),
  getAvailableQueries: () => ipcRenderer.invoke('queries:getAvailable'),
  getUsedQueries: () => ipcRenderer.invoke('queries:getUsed'),
  addQueries: (queries: string[]) => ipcRenderer.invoke('queries:add', queries),
  resetUsedQueries: () => ipcRenderer.invoke('queries:resetUsed'),
  clearAllQueries: () => ipcRenderer.invoke('queries:clearAll'),
  resetToDefaultQueries: () => ipcRenderer.invoke('queries:resetToDefault'),
});

// Type declarations for renderer
declare global {
  interface Window {
    api: {
      // Profiles
      getProfiles: () => Promise<(Profile & { isRunning: boolean })[]>;
      getProfile: (id: string) => Promise<(Profile & { isRunning: boolean }) | null>;
      createProfile: (data: {
        name: string;
        os?: string;
        proxy?: ProxyConfig | string;
        notes?: string;
        fingerprint?: Fingerprint;
        startHomepage?: boolean;
        homepageUrl?: string;
        group?: string;
        autoStart?: boolean;
      }) => Promise<Profile | { error: string }>;
      updateProfile: (data: Partial<Profile> & { id: string }) => Promise<Profile | { error: string }>;
      deleteProfile: (id: string) => Promise<{ success: boolean } | { error: string }>;

      // Browser
      launchBrowser: (id: string) => Promise<{ success: boolean } | { error: string }>;
      stopBrowser: (id: string) => Promise<{ success: boolean } | { error: string }>;
      getBrowserStatus: (id: string) => Promise<{ isRunning: boolean }>;
      navigateToUrl: (id: string, url: string) => Promise<{ success: boolean } | { error: string }>;

      // Fingerprint
      generateFingerprint: (options?: { os?: string; screen?: { width: number; height: number } | null }) => Promise<Fingerprint>;

      // Proxy
      testProxy: (proxy: ProxyConfig | string) => Promise<{
        success: boolean;
        ip?: string;
        latency?: number;
        error?: string;
      }>;

      // Shell
      openExternal: (url: string) => Promise<void>;

      // Data management
      clearAllData: () => Promise<{ success: boolean } | { error: string }>;

      // Farming
      startFarming: (data: {
        profileIds: string[];
        config: {
          desktopSearches: number;
          mobileSearches: number;
          dailySet: boolean;
        };
        customQueries?: string[];
      }) => Promise<{ success: boolean } | { error: string }>;
      stopFarming: () => Promise<{ success: boolean }>;
      onFarmingProgress?: (callback: (event: any, data: any) => void) => void;
      offFarmingProgress?: (callback: (event: any, data: any) => void) => void;

      // Groups
      getGroups: () => Promise<ProfileGroup[]>;
      createGroup: (data: { name: string; color: string }) => Promise<ProfileGroup | { error: string }>;
      updateGroup: (group: ProfileGroup) => Promise<{ success: boolean } | { error: string }>;
      deleteGroup: (id: string) => Promise<{ success: boolean } | { error: string }>;

      // Templates
      getTemplates: () => Promise<ProfileTemplate[]>;
      createTemplate: (data: Omit<ProfileTemplate, 'id' | 'createdAt'>) => Promise<ProfileTemplate | { error: string }>;
      updateTemplate: (template: ProfileTemplate) => Promise<{ success: boolean } | { error: string }>;
      deleteTemplate: (id: string) => Promise<{ success: boolean } | { error: string }>;

      // Schedules
      getSchedules: () => Promise<FarmingSchedule[]>;
      createSchedule: (data: Omit<FarmingSchedule, 'id' | 'createdAt' | 'lastRun'>) => Promise<FarmingSchedule | { error: string }>;
      updateSchedule: (schedule: FarmingSchedule) => Promise<{ success: boolean } | { error: string }>;
      deleteSchedule: (id: string) => Promise<{ success: boolean } | { error: string }>;
      getNextScheduledRun: () => Promise<{ schedule: FarmingSchedule; nextRun: Date } | null>;

      // Telegram
      getTelegramConfig: () => Promise<TelegramConfig>;
      updateTelegramConfig: (config: TelegramConfig) => Promise<{ success: boolean } | { error: string }>;
      testTelegram: (botToken: string, chatId: string) => Promise<{ success: boolean; error?: string }>;

      // Backup
      getBackupConfig: () => Promise<BackupConfig>;
      updateBackupConfig: (config: BackupConfig) => Promise<{ success: boolean } | { error: string }>;
      createBackup: () => Promise<{ success: boolean; path?: string } | { error: string }>;
      getBackups: () => Promise<{ name: string; path: string; date: Date; size: number }[]>;
      restoreBackup: (path: string) => Promise<{ success: boolean } | { error: string }>;
      deleteBackup: (path: string) => Promise<{ success: boolean } | { error: string }>;

      // Export/Import
      exportProfile: (id: string) => Promise<{ success: boolean; data?: string } | { error: string }>;
      exportAllProfiles: () => Promise<{ success: boolean; data?: string } | { error: string }>;
      importProfile: (json: string) => Promise<{ success: boolean; profile?: Profile } | { error: string }>;
      importProfiles: (json: string) => Promise<{ success: boolean; count?: number; profiles?: Profile[] } | { error: string }>;

      // Bulk operations
      bulkCreateProfiles: (data: {
        count: number;
        namePrefix: string;
        os: 'windows' | 'macos' | 'linux';
        group?: string;
        templateId?: string;
      }) => Promise<{ success: boolean; count?: number; profiles?: Profile[] } | { error: string }>;
      bulkDeleteProfiles: (ids: string[]) => Promise<{ success: boolean } | { error: string }>;

      // Cookies
      getCookies: (profileId: string) => Promise<{ path?: string; exists?: boolean; message?: string; cookies?: any[] } | { error: string }>;
      clearCookies: (profileId: string) => Promise<{ success: boolean } | { error: string }>;

      // Query Management
      getQueryStats: () => Promise<{ available: number; used: number; total: number }>;
      getAvailableQueries: () => Promise<string[]>;
      getUsedQueries: () => Promise<string[]>;
      addQueries: (queries: string[]) => Promise<{ success: boolean; added?: number } | { error: string }>;
      resetUsedQueries: () => Promise<{ success: boolean } | { error: string }>;
      clearAllQueries: () => Promise<{ success: boolean } | { error: string }>;
      resetToDefaultQueries: () => Promise<{ success: boolean } | { error: string }>;
    };
  }
}
