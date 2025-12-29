import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { Profile } from './types';

let db: Database.Database;

export function initDatabase(): void {
  const userDataPath = app?.getPath('userData') || process.cwd();
  const dbPath = path.join(userDataPath, 'profiles.db');

  db = new Database(dbPath);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used TEXT,
      fingerprint TEXT NOT NULL,
      proxy TEXT,
      notes TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
    CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at);
  `);
}

export function getAllProfiles(): Profile[] {
  const stmt = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC');
  const rows = stmt.all() as any[];

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    lastUsed: row.last_used,
    fingerprint: JSON.parse(row.fingerprint),
    proxy: row.proxy ? JSON.parse(row.proxy) : null,
    notes: row.notes || '',
  }));
}

export function getProfile(id: string): Profile | null {
  const stmt = db.prepare('SELECT * FROM profiles WHERE id = ?');
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    lastUsed: row.last_used,
    fingerprint: JSON.parse(row.fingerprint),
    proxy: row.proxy ? JSON.parse(row.proxy) : null,
    notes: row.notes || '',
  };
}

export function createProfile(profile: Profile): void {
  const stmt = db.prepare(`
    INSERT INTO profiles (id, name, created_at, last_used, fingerprint, proxy, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    profile.id,
    profile.name,
    profile.createdAt,
    profile.lastUsed,
    JSON.stringify(profile.fingerprint),
    profile.proxy ? JSON.stringify(profile.proxy) : null,
    profile.notes
  );
}

export function updateProfile(profile: Profile): void {
  const stmt = db.prepare(`
    UPDATE profiles
    SET name = ?, last_used = ?, fingerprint = ?, proxy = ?, notes = ?
    WHERE id = ?
  `);

  stmt.run(
    profile.name,
    profile.lastUsed,
    JSON.stringify(profile.fingerprint),
    profile.proxy ? JSON.stringify(profile.proxy) : null,
    profile.notes,
    profile.id
  );
}

export function deleteProfile(id: string): void {
  const stmt = db.prepare('DELETE FROM profiles WHERE id = ?');
  stmt.run(id);
}

export function updateLastUsed(id: string): void {
  const stmt = db.prepare('UPDATE profiles SET last_used = ? WHERE id = ?');
  stmt.run(new Date().toISOString(), id);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
