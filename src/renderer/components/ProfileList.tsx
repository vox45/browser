import React, { useState } from 'react';
import { Profile } from '../../core/types';
import './ProfileList.css';

interface ProfileWithStatus extends Profile {
  isRunning: boolean;
}

interface ProfileListProps {
  profiles: ProfileWithStatus[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (profile: ProfileWithStatus) => void;
  onDelete: (id: string) => void;
  onLaunch: (id: string) => void;
  onStop: (id: string) => void;
  onCheckFingerprint: (id: string, site?: string) => void;
}

export function ProfileList({
  profiles,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onLaunch,
  onStop,
  onCheckFingerprint,
}: ProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <h3>No profiles yet</h3>
        <p>Create your first browser profile to get started</p>
      </div>
    );
  }

  const allSelected = profiles.length > 0 && profiles.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  return (
    <div className="profile-list-container">
      {profiles.length > 1 && (
        <div className="list-toolbar">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={e => onSelectAll(e.target.checked)}
            />
            <span>Select all ({profiles.length})</span>
          </label>
          {someSelected && (
            <span className="selected-count">{selectedIds.size} selected</span>
          )}
        </div>
      )}
      <div className="profile-grid">
        {profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            selected={selectedIds.has(profile.id)}
            onSelect={(selected) => onSelect(profile.id, selected)}
            onEdit={() => onEdit(profile)}
            onDelete={() => onDelete(profile.id)}
            onLaunch={() => onLaunch(profile.id)}
            onStop={() => onStop(profile.id)}
            onCheckFingerprint={(site) => onCheckFingerprint(profile.id, site)}
          />
        ))}
      </div>
    </div>
  );
}

interface ProfileCardProps {
  profile: ProfileWithStatus;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onLaunch: () => void;
  onStop: () => void;
  onCheckFingerprint: (site?: string) => void;
}

function ProfileCard({ profile, selected, onSelect, onEdit, onDelete, onLaunch, onStop, onCheckFingerprint }: ProfileCardProps) {
  const [showCheckMenu, setShowCheckMenu] = useState(false);

  const checkSites = [
    { id: 'browserleaks', name: 'BrowserLeaks', icon: '🔍' },
    { id: 'creepjs', name: 'CreepJS', icon: '👻' },
    { id: 'pixelscan', name: 'Pixelscan', icon: '📡' },
    { id: 'iphey', name: 'Iphey', icon: '🛡️' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
  ];

  const getOsIcon = () => {
    const ua = profile.fingerprint.userAgent.toLowerCase();
    if (ua.includes('windows')) return '🪟';
    if (ua.includes('mac')) return '🍎';
    if (ua.includes('linux')) return '🐧';
    return '💻';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLocationName = () => {
    const geo = profile.fingerprint.geolocation;
    if (!geo?.enabled) return 'Disabled';
    // Simple reverse lookup based on timezone
    const tz = profile.fingerprint.timezone;
    const cities: { [key: string]: string } = {
      'America/New_York': 'New York',
      'America/Los_Angeles': 'Los Angeles',
      'America/Chicago': 'Chicago',
      'Europe/London': 'London',
      'Europe/Paris': 'Paris',
      'Europe/Berlin': 'Berlin',
      'Europe/Moscow': 'Moscow',
      'Asia/Tokyo': 'Tokyo',
    };
    return cities[tz] || tz.split('/')[1] || 'Custom';
  };

  return (
    <div className={`profile-card ${profile.isRunning ? 'running' : ''} ${selected ? 'selected' : ''}`}>
      <div className="profile-header">
        <label className="profile-checkbox" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={e => onSelect(e.target.checked)}
          />
        </label>
        <div className="profile-avatar">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h3 className="profile-name">{profile.name}</h3>
          <span className="profile-os">{getOsIcon()} {profile.fingerprint.platform}</span>
        </div>
        {profile.isRunning && (
          <span className="badge badge-success">Running</span>
        )}
      </div>

      <div className="profile-details">
        <div className="detail-row">
          <span className="detail-label">Proxy</span>
          <span className="detail-value">
            {profile.proxy ? (
              <span className="proxy-active">
                {profile.proxy.host}:{profile.proxy.port}
              </span>
            ) : (
              <span className="proxy-none">None</span>
            )}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Location</span>
          <span className="detail-value">{getLocationName()}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Screen</span>
          <span className="detail-value">
            {profile.fingerprint.screen.width}x{profile.fingerprint.screen.height}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Last used</span>
          <span className="detail-value">{formatDate(profile.lastUsed)}</span>
        </div>
      </div>

      <div className="profile-actions">
        {profile.isRunning ? (
          <button className="btn btn-secondary" onClick={onStop}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Stop
          </button>
        ) : (
          <button className="btn btn-success" onClick={onLaunch}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Start
          </button>
        )}
        <div className="dropdown-container">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setShowCheckMenu(!showCheckMenu)}
            title="Check Fingerprint"
            disabled={!profile.isRunning}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
          </button>
          {showCheckMenu && (
            <div className="dropdown-menu">
              {checkSites.map(site => (
                <button
                  key={site.id}
                  className="dropdown-item"
                  onClick={() => {
                    onCheckFingerprint(site.id);
                    setShowCheckMenu(false);
                  }}
                >
                  <span>{site.icon}</span>
                  <span>{site.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-secondary btn-icon" onClick={onEdit} title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onDelete}
          title="Delete"
          disabled={profile.isRunning}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
