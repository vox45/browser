import React from 'react';
import { Profile } from '../../core/types';
import './ProfileList.css';

interface ProfileWithStatus extends Profile {
  isRunning: boolean;
}

interface ProfileListProps {
  profiles: ProfileWithStatus[];
  onEdit: (profile: ProfileWithStatus) => void;
  onDelete: (id: string) => void;
  onLaunch: (id: string) => void;
  onStop: (id: string) => void;
}

export function ProfileList({
  profiles,
  onEdit,
  onDelete,
  onLaunch,
  onStop,
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

  return (
    <div className="profile-grid">
      {profiles.map(profile => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          onEdit={() => onEdit(profile)}
          onDelete={() => onDelete(profile.id)}
          onLaunch={() => onLaunch(profile.id)}
          onStop={() => onStop(profile.id)}
        />
      ))}
    </div>
  );
}

interface ProfileCardProps {
  profile: ProfileWithStatus;
  onEdit: () => void;
  onDelete: () => void;
  onLaunch: () => void;
  onStop: () => void;
}

function ProfileCard({ profile, onEdit, onDelete, onLaunch, onStop }: ProfileCardProps) {
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

  return (
    <div className={`profile-card ${profile.isRunning ? 'running' : ''}`}>
      <div className="profile-header">
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
          <span className="detail-label">Last used</span>
          <span className="detail-value">{formatDate(profile.lastUsed)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Screen</span>
          <span className="detail-value">
            {profile.fingerprint.screen.width}x{profile.fingerprint.screen.height}
          </span>
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
