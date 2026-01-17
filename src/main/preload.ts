import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Profile, Fingerprint, ProxyConfig } from '../core/types';

// Farming progress callback storage
const farmingProgressCallbacks = new Set<(event: IpcRendererEvent, data: any) => void>();

// Expose API to renderer
contextBridge.exposeInMainWorld('api', {
  // Profiles
  getProfiles: () => ipcRenderer.invoke('profile:list'),
  getProfile: (id: string) => ipcRenderer.invoke('profile:get', id),
  createProfile: (data: { name: string; os?: string; proxy?: ProxyConfig | string; notes?: string; fingerprint?: Fingerprint; startHomepage?: boolean; homepageUrl?: string }) =>
    ipcRenderer.invoke('profile:create', data),
  updateProfile: (data: Partial<Profile> & { id: string }) =>
    ipcRenderer.invoke('profile:update', data),
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
  startFarming: (data: {
    profileIds: string[];
    config: {
      desktopSearches: number;
      mobileSearches: number;
      dailySet: boolean;
    };
    customQueries?: string[];
  }) => ipcRenderer.invoke('farming:start', data),
  stopFarming: () => ipcRenderer.invoke('farming:stop'),
  onFarmingProgress: (callback: (event: IpcRendererEvent, data: any) => void) => {
    farmingProgressCallbacks.add(callback);
    ipcRenderer.on('farming:progress', callback);
  },
  offFarmingProgress: (callback: (event: IpcRendererEvent, data: any) => void) => {
    farmingProgressCallbacks.delete(callback);
    ipcRenderer.off('farming:progress', callback);
  },
});

// Type declarations for renderer
declare global {
  interface Window {
    api: {
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
      }) => Promise<Profile | { error: string }>;
      updateProfile: (data: Partial<Profile> & { id: string }) => Promise<Profile | { error: string }>;
      deleteProfile: (id: string) => Promise<{ success: boolean } | { error: string }>;
      launchBrowser: (id: string) => Promise<{ success: boolean } | { error: string }>;
      stopBrowser: (id: string) => Promise<{ success: boolean } | { error: string }>;
      getBrowserStatus: (id: string) => Promise<{ isRunning: boolean }>;
      navigateToUrl: (id: string, url: string) => Promise<{ success: boolean } | { error: string }>;
      generateFingerprint: (options?: { os?: string; screen?: { width: number; height: number } | null }) => Promise<Fingerprint>;
      testProxy: (proxy: ProxyConfig | string) => Promise<{
        success: boolean;
        ip?: string;
        latency?: number;
        error?: string;
      }>;
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
    };
  }
}
