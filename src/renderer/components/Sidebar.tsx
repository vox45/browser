import React from 'react';
import './Sidebar.css';

type Page = 'profiles' | 'running' | 'automation' | 'settings';

interface SidebarProps {
  totalProfiles: number;
  runningProfiles: number;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ totalProfiles, runningProfiles, currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-title">Phantom</span>
            <span className="logo-subtitle">Browser</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Main</div>

        <button
          className={`nav-item ${currentPage === 'profiles' ? 'active' : ''}`}
          onClick={() => onNavigate('profiles')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <span>Profiles</span>
          <span className="nav-badge">{totalProfiles}</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'running' ? 'active' : ''}`}
          onClick={() => onNavigate('running')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10,8 16,12 10,16" fill={runningProfiles > 0 ? 'currentColor' : 'none'} />
          </svg>
          <span>Running</span>
          {runningProfiles > 0 && (
            <span className="nav-badge running">{runningProfiles}</span>
          )}
        </button>

        <div className="nav-divider"></div>

        <div className="nav-section-title">Automation</div>

        <button
          className={`nav-item ${currentPage === 'automation' ? 'active' : ''}`}
          onClick={() => onNavigate('automation')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>Bing Farming</span>
        </button>

        <div className="nav-divider"></div>

        <div className="nav-section-title">System</div>

        <button
          className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-content">
          <span className="version">v1.0.0</span>
          <div className="sidebar-status">
            <span className="status-dot"></span>
            <span>Ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
