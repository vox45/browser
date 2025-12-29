import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Profile } from './types';

let dbPath: string;
let profiles: Profile[] = [];

export function initDatabase(): void {
  const userDataPath = app?.getPath('userData') || process.cwd();
  dbPath = path.join(userDataPath, 'profiles.json');

  // Load existing profiles
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      profiles = JSON.parse(data);
    } catch (e) {
      profiles = [];
    }
  } else {
    profiles = [];
    saveToFile();
  }
}

function saveToFile(): void {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save profiles:', e);
  }
}

export function getAllProfiles(): Profile[] {
  return [...profiles].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getProfile(id: string): Profile | null {
  return profiles.find(p => p.id === id) || null;
}

export function createProfile(profile: Profile): void {
  profiles.push(profile);
  saveToFile();
}

export function updateProfile(profile: Profile): void {
  const index = profiles.findIndex(p => p.id === profile.id);
  if (index !== -1) {
    profiles[index] = profile;
    saveToFile();
  }
}

export function deleteProfile(id: string): void {
  profiles = profiles.filter(p => p.id !== id);
  saveToFile();
}

export function updateLastUsed(id: string): void {
  const profile = profiles.find(p => p.id === id);
  if (profile) {
    profile.lastUsed = new Date().toISOString();
    saveToFile();
  }
}

export function closeDatabase(): void {
  saveToFile();
}
