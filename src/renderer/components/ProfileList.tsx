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
  onTestFingerprint: (profile: ProfileWithStatus) => void;
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
  onTestFingerprint,
}: ProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h3>No profiles yet</h3>
        <p>Create your first browser profile to get started with anonymous browsing</p>
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
            onTestFingerprint={() => onTestFingerprint(profile)}
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
  onTestFingerprint: () => void;
}

function ProfileCard({ profile, selected, onSelect, onEdit, onDelete, onLaunch, onStop, onCheckFingerprint, onTestFingerprint }: ProfileCardProps) {
  const [showCheckMenu, setShowCheckMenu] = useState(false);

  const checkSites = [
    { id: 'browserleaks', name: 'BrowserLeaks', icon: '🔍' },
    { id: 'creepjs', name: 'CreepJS', icon: '👻' },
    { id: 'pixelscan', name: 'Pixelscan', icon: '📡' },
    { id: 'iphey', name: 'Iphey', icon: '🛡️' },
    { id: 'settings', name: 'Chrome Settings', icon: '⚙️' },
  ];

  const getOsIcon = () => {
    const ua = profile.fingerprint.userAgent.toLowerCase();
    if (ua.includes('windows')) return '🪟';
    if (ua.includes('mac')) return '🍎';
    if (ua.includes('linux')) return '🐧';
    return '💻';
  };

  const getOsName = () => {
    const ua = profile.fingerprint.userAgent.toLowerCase();
    if (ua.includes('windows 11') || ua.includes('windows nt 11')) return 'Windows 11';
    if (ua.includes('windows')) return 'Windows 10';
    if (ua.includes('mac os x')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    return profile.fingerprint.platform;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getLocationName = () => {
    const geo = profile.fingerprint.geolocation;
    if (!geo?.enabled) return 'Not set';
    const tz = profile.fingerprint.timezone;
    const cities: { [key: string]: string } = {
      'America/New_York': 'New York, US',
      'America/Los_Angeles': 'Los Angeles, US',
      'America/Chicago': 'Chicago, US',
      'America/Denver': 'Denver, US',
      'America/Toronto': 'Toronto, CA',
      'America/Vancouver': 'Vancouver, CA',
      'America/Mexico_City': 'Mexico City',
      'America/Sao_Paulo': 'Sao Paulo, BR',
      'Europe/London': 'London, UK',
      'Europe/Paris': 'Paris, FR',
      'Europe/Berlin': 'Berlin, DE',
      'Europe/Rome': 'Rome, IT',
      'Europe/Madrid': 'Madrid, ES',
      'Europe/Amsterdam': 'Amsterdam, NL',
      'Europe/Moscow': 'Moscow, RU',
      'Europe/Kiev': 'Kyiv, UA',
      'Europe/Warsaw': 'Warsaw, PL',
      'Europe/Prague': 'Prague, CZ',
      'Europe/Istanbul': 'Istanbul, TR',
      'Asia/Tokyo': 'Tokyo, JP',
      'Asia/Shanghai': 'Shanghai, CN',
      'Asia/Hong_Kong': 'Hong Kong',
      'Asia/Singapore': 'Singapore',
      'Asia/Seoul': 'Seoul, KR',
      'Asia/Bangkok': 'Bangkok, TH',
      'Asia/Dubai': 'Dubai, AE',
      'Asia/Kolkata': 'Mumbai, IN',
      'Australia/Sydney': 'Sydney, AU',
      'Australia/Melbourne': 'Melbourne, AU',
      'Pacific/Auckland': 'Auckland, NZ',
    };
    return cities[tz] || tz.split('/').pop()?.replace('_', ' ') || 'Custom';
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
          <span className="profile-os">
            <span className="profile-os-icon">{getOsIcon()}</span>
            {getOsName()}
          </span>
        </div>
        {profile.isRunning && (
          <div className="running-indicator">
            <span className="dot"></span>
            Running
          </div>
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
              <span className="proxy-none">Direct</span>
            )}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Location</span>
          <span className="detail-value">{getLocationName()}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Resolution</span>
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

        <button
          className="btn btn-secondary btn-icon test-btn-container"
          onClick={onTestFingerprint}
          title="Test Fingerprint"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </button>

        <div className="dropdown-container">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setShowCheckMenu(!showCheckMenu)}
            title="Open Test Site"
            disabled={!profile.isRunning}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
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

        <button className="btn btn-secondary btn-icon" onClick={onEdit} title="Edit Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        <button
          className="btn btn-secondary btn-icon"
          onClick={onDelete}
          title="Delete Profile"
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
