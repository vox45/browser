import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Profile, ProfileGroup, ProfileTemplate, FarmingSchedule, TelegramConfig, BackupConfig, ProfileStats } from './types';

interface DatabaseData {
  profiles: Profile[];
  groups: ProfileGroup[];
  templates: ProfileTemplate[];
  schedules: FarmingSchedule[];
  telegram: TelegramConfig;
  backup: BackupConfig;
}

let dbPath: string;
let backupsDir: string;
let data: DatabaseData = {
  profiles: [],
  groups: [],
  templates: [],
  schedules: [],
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    notifyOnStart: true,
    notifyOnComplete: true,
    notifyOnError: true,
  },
  backup: {
    autoBackup: false,
    backupInterval: 'weekly',
    maxBackups: 5,
    lastBackup: null,
  },
};

const defaultStats: ProfileStats = {
  launchCount: 0,
  totalTimeMs: 0,
  lastSessionStart: null,
  searchesCompleted: 0,
  dailySetsCompleted: 0,
};

export function initDatabase(): void {
  const userDataPath = app?.getPath('userData') || process.cwd();
  dbPath = path.join(userDataPath, 'database.json');
  backupsDir = path.join(userDataPath, 'backups');

  // Ensure backups directory exists
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Load existing data
  if (fs.existsSync(dbPath)) {
    try {
      const fileData = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(fileData);
      data = { ...data, ...parsed };
      // Migrate old profiles without new fields
      data.profiles = data.profiles.map(p => ({
        ...p,
        group: p.group || '',
        autoStart: p.autoStart || false,
        stats: p.stats || { ...defaultStats },
      }));
    } catch (e) {
      console.error('Failed to load database:', e);
    }
  } else {
    // Try to migrate from old profiles.json
    const oldPath = path.join(userDataPath, 'profiles.json');
    if (fs.existsSync(oldPath)) {
      try {
        const oldData = fs.readFileSync(oldPath, 'utf-8');
        const oldProfiles = JSON.parse(oldData);
        data.profiles = oldProfiles.map((p: any) => ({
          ...p,
          group: '',
          autoStart: false,
          stats: { ...defaultStats },
        }));
      } catch (e) {
        console.error('Failed to migrate old profiles:', e);
      }
    }
    saveToFile();
  }
}

function saveToFile(): void {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save database:', e);
  }
}

// ==================== Profiles ====================

export function getAllProfiles(): Profile[] {
  return [...data.profiles].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getProfile(id: string): Profile | null {
  return data.profiles.find(p => p.id === id) || null;
}

export function createProfile(profile: Profile): void {
  // Ensure new fields exist
  profile.group = profile.group || '';
  profile.autoStart = profile.autoStart || false;
  profile.stats = profile.stats || { ...defaultStats };
  data.profiles.push(profile);
  saveToFile();
}

export function updateProfile(profile: Profile): void {
  const index = data.profiles.findIndex(p => p.id === profile.id);
  if (index !== -1) {
    data.profiles[index] = profile;
    saveToFile();
  }
}

export function deleteProfile(id: string): void {
  data.profiles = data.profiles.filter(p => p.id !== id);
  saveToFile();
}

export function updateLastUsed(id: string): void {
  const profile = data.profiles.find(p => p.id === id);
  if (profile) {
    profile.lastUsed = new Date().toISOString();
    saveToFile();
  }
}

export function updateProfileStats(id: string, updates: Partial<ProfileStats>): void {
  const profile = data.profiles.find(p => p.id === id);
  if (profile) {
    profile.stats = { ...profile.stats, ...updates };
    saveToFile();
  }
}

export function incrementLaunchCount(id: string): void {
  const profile = data.profiles.find(p => p.id === id);
  if (profile) {
    profile.stats.launchCount++;
    profile.stats.lastSessionStart = new Date().toISOString();
    saveToFile();
  }
}

export function addSessionTime(id: string, timeMs: number): void {
  const profile = data.profiles.find(p => p.id === id);
  if (profile) {
    profile.stats.totalTimeMs += timeMs;
    saveToFile();
  }
}

export function getAutoStartProfiles(): Profile[] {
  return data.profiles.filter(p => p.autoStart);
}

// ==================== Groups ====================

export function getAllGroups(): ProfileGroup[] {
  return [...data.groups].sort((a, b) => a.name.localeCompare(b.name));
}

export function createGroup(group: ProfileGroup): void {
  data.groups.push(group);
  saveToFile();
}

export function updateGroup(group: ProfileGroup): void {
  const index = data.groups.findIndex(g => g.id === group.id);
  if (index !== -1) {
    data.groups[index] = group;
    saveToFile();
  }
}

export function deleteGroup(id: string): void {
  data.groups = data.groups.filter(g => g.id !== id);
  // Remove group from profiles
  data.profiles.forEach(p => {
    if (p.group === id) {
      p.group = '';
    }
  });
  saveToFile();
}

// ==================== Templates ====================

export function getAllTemplates(): ProfileTemplate[] {
  return [...data.templates].sort((a, b) => a.name.localeCompare(b.name));
}

export function createTemplate(template: ProfileTemplate): void {
  data.templates.push(template);
  saveToFile();
}

export function updateTemplate(template: ProfileTemplate): void {
  const index = data.templates.findIndex(t => t.id === template.id);
  if (index !== -1) {
    data.templates[index] = template;
    saveToFile();
  }
}

export function deleteTemplate(id: string): void {
  data.templates = data.templates.filter(t => t.id !== id);
  saveToFile();
}

// ==================== Schedules ====================

export function getAllSchedules(): FarmingSchedule[] {
  return [...data.schedules];
}

export function createSchedule(schedule: FarmingSchedule): void {
  data.schedules.push(schedule);
  saveToFile();
}

export function updateSchedule(schedule: FarmingSchedule): void {
  const index = data.schedules.findIndex(s => s.id === schedule.id);
  if (index !== -1) {
    data.schedules[index] = schedule;
    saveToFile();
  }
}

export function deleteSchedule(id: string): void {
  data.schedules = data.schedules.filter(s => s.id !== id);
  saveToFile();
}

export function updateScheduleLastRun(id: string): void {
  const schedule = data.schedules.find(s => s.id === id);
  if (schedule) {
    schedule.lastRun = new Date().toISOString();
    saveToFile();
  }
}

// ==================== Telegram ====================

export function getTelegramConfig(): TelegramConfig {
  return { ...data.telegram };
}

export function updateTelegramConfig(config: TelegramConfig): void {
  data.telegram = config;
  saveToFile();
}

// ==================== Backup ====================

export function getBackupConfig(): BackupConfig {
  return { ...data.backup };
}

export function updateBackupConfig(config: BackupConfig): void {
  data.backup = config;
  saveToFile();
}

export function createBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `backup-${timestamp}.json`);

  // Copy current database
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');

  // Update last backup time
  data.backup.lastBackup = new Date().toISOString();
  saveToFile();

  // Clean up old backups
  cleanupOldBackups();

  return backupPath;
}

export function getBackupsList(): { name: string; path: string; date: Date; size: number }[] {
  if (!fs.existsSync(backupsDir)) {
    return [];
  }

  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .map(f => {
      const filePath = path.join(backupsDir, f);
      const stats = fs.statSync(filePath);
      return {
        name: f,
        path: filePath,
        date: stats.mtime,
        size: stats.size,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return files;
}

export function restoreBackup(backupPath: string): boolean {
  try {
    const backupData = fs.readFileSync(backupPath, 'utf-8');
    const parsed = JSON.parse(backupData);
    data = { ...data, ...parsed };
    saveToFile();
    return true;
  } catch (e) {
    console.error('Failed to restore backup:', e);
    return false;
  }
}

export function deleteBackup(backupPath: string): boolean {
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to delete backup:', e);
    return false;
  }
}

function cleanupOldBackups(): void {
  const backups = getBackupsList();
  const maxBackups = data.backup.maxBackups || 5;

  if (backups.length > maxBackups) {
    const toDelete = backups.slice(maxBackups);
    toDelete.forEach(b => {
      try {
        fs.unlinkSync(b.path);
      } catch (e) {
        console.error('Failed to delete old backup:', e);
      }
    });
  }
}

// ==================== Export/Import ====================

export function exportProfile(id: string): string | null {
  const profile = data.profiles.find(p => p.id === id);
  if (!profile) return null;
  return JSON.stringify(profile, null, 2);
}

export function exportAllProfiles(): string {
  return JSON.stringify(data.profiles, null, 2);
}

export function importProfile(profileJson: string): Profile | null {
  try {
    const profile = JSON.parse(profileJson) as Profile;
    // Generate new ID to avoid conflicts
    profile.id = require('uuid').v4();
    profile.createdAt = new Date().toISOString();
    profile.lastUsed = null;
    profile.stats = { ...defaultStats };
    data.profiles.push(profile);
    saveToFile();
    return profile;
  } catch (e) {
    console.error('Failed to import profile:', e);
    return null;
  }
}

export function importProfiles(profilesJson: string): Profile[] {
  try {
    const profiles = JSON.parse(profilesJson) as Profile[];
    const imported: Profile[] = [];

    profiles.forEach(profile => {
      profile.id = require('uuid').v4();
      profile.createdAt = new Date().toISOString();
      profile.lastUsed = null;
      profile.stats = { ...defaultStats };
      data.profiles.push(profile);
      imported.push(profile);
    });

    saveToFile();
    return imported;
  } catch (e) {
    console.error('Failed to import profiles:', e);
    return [];
  }
}

// ==================== Bulk Operations ====================

export function createBulkProfiles(profiles: Profile[]): Profile[] {
  profiles.forEach(p => {
    p.group = p.group || '';
    p.autoStart = p.autoStart || false;
    p.stats = p.stats || { ...defaultStats };
    data.profiles.push(p);
  });
  saveToFile();
  return profiles;
}

export function deleteMultipleProfiles(ids: string[]): void {
  data.profiles = data.profiles.filter(p => !ids.includes(p.id));
  saveToFile();
}

// ==================== General ====================

export function closeDatabase(): void {
  saveToFile();
}

export function clearAllProfiles(): void {
  data.profiles = [];
  saveToFile();
}

export function clearAllData(): void {
  data = {
    profiles: [],
    groups: [],
    templates: [],
    schedules: [],
    telegram: {
      enabled: false,
      botToken: '',
      chatId: '',
      notifyOnStart: true,
      notifyOnComplete: true,
      notifyOnError: true,
    },
    backup: {
      autoBackup: false,
      backupInterval: 'weekly',
      maxBackups: 5,
      lastBackup: null,
    },
  };
  saveToFile();
}

export function getProfilesDir(): string {
  const userDataPath = app?.getPath('userData') || process.cwd();
  return path.join(userDataPath, 'browser_profiles');
}

export function getBackupsDir(): string {
  return backupsDir;
}
