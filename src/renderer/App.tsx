import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ProfileList } from './components/ProfileList';
import { ProfileModal } from './components/ProfileModal';
import { SettingsPage } from './components/SettingsPage';
import { Profile } from '../core/types';
import './styles/app.css';

interface ProfileWithStatus extends Profile {
  isRunning: boolean;
}

type Page = 'profiles' | 'running' | 'settings';

function App() {
  const [profiles, setProfiles] = useState<ProfileWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileWithStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<Page>('profiles');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadProfiles = useCallback(async () => {
    try {
      const data = await window.api.getProfiles();
      if (Array.isArray(data)) {
        setProfiles(data);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
    // Refresh every 3 seconds to update running status
    const interval = setInterval(loadProfiles, 3000);
    return () => clearInterval(interval);
  }, [loadProfiles]);

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setModalOpen(true);
  };

  const handleEditProfile = (profile: ProfileWithStatus) => {
    setEditingProfile(profile);
    setModalOpen(true);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      await window.api.deleteProfile(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const handleLaunchProfile = async (id: string) => {
    try {
      const result = await window.api.launchBrowser(id);
      if ('error' in result) {
        alert(`Failed to launch: ${result.error}`);
      } else {
        setProfiles(prev =>
          prev.map(p => (p.id === id ? { ...p, isRunning: true } : p))
        );
      }
    } catch (error) {
      console.error('Failed to launch browser:', error);
    }
  };

  const handleStopProfile = async (id: string) => {
    try {
      await window.api.stopBrowser(id);
      setProfiles(prev =>
        prev.map(p => (p.id === id ? { ...p, isRunning: false } : p))
      );
    } catch (error) {
      console.error('Failed to stop browser:', error);
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredProfiles.map(p => p.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleCheckFingerprint = async (id: string, site?: string) => {
    const checkSites: { [key: string]: string } = {
      browserleaks: 'https://browserleaks.com/',
      creepjs: 'https://abrahamjuliot.github.io/creepjs/',
      pixelscan: 'https://pixelscan.net/',
      iphey: 'https://iphey.com/',
      settings: 'chrome://settings/',
    };
    const url = site ? checkSites[site] || checkSites.browserleaks : checkSites.browserleaks;

    try {
      const result = await window.api.navigateToUrl(id, url);
      if ('error' in result) {
        alert(`Failed to open fingerprint check: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to check fingerprint:', error);
    }
  };

  const handleMassLaunch = async () => {
    const selectedProfiles = profiles.filter(p => selectedIds.has(p.id) && !p.isRunning);
    for (const profile of selectedProfiles) {
      await handleLaunchProfile(profile.id);
    }
    setSelectedIds(new Set());
  };

  const handleMassStop = async () => {
    const selectedProfiles = profiles.filter(p => selectedIds.has(p.id) && p.isRunning);
    for (const profile of selectedProfiles) {
      await handleStopProfile(profile.id);
    }
    setSelectedIds(new Set());
  };

  const handleSaveProfile = async (data: {
    name: string;
    os: string;
    proxy: string;
    notes: string;
  }) => {
    try {
      if (editingProfile) {
        const result = await window.api.updateProfile({
          id: editingProfile.id,
          name: data.name,
          notes: data.notes,
          proxy: data.proxy || null,
        });

        if ('error' in result) {
          alert(`Failed to update: ${result.error}`);
          return;
        }

        setProfiles(prev =>
          prev.map(p => (p.id === editingProfile.id ? { ...result, isRunning: p.isRunning } : p))
        );
      } else {
        const result = await window.api.createProfile({
          name: data.name,
          os: data.os as 'windows' | 'macos' | 'linux',
          proxy: data.proxy || undefined,
          notes: data.notes,
        });

        if ('error' in result) {
          alert(`Failed to create: ${result.error}`);
          return;
        }

        setProfiles(prev => [{ ...result, isRunning: false }, ...prev]);
      }

      setModalOpen(false);
      setEditingProfile(null);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const runningProfiles = profiles.filter(p => p.isRunning);
  const runningCount = runningProfiles.length;

  const renderContent = () => {
    if (currentPage === 'settings') {
      return <SettingsPage />;
    }

    const displayProfiles = currentPage === 'running' ? runningProfiles : filteredProfiles;
    const title = currentPage === 'running' ? 'Running' : 'Profiles';
    const count = currentPage === 'running' ? runningCount : profiles.length;

    return (
      <>
        <header className="header">
          <div className="header-left">
            <h1>{title}</h1>
            <span className="profile-count">
              {count} {currentPage === 'running' ? 'running' : 'profiles'}
            </span>
          </div>
          <div className="header-right">
            {selectedIds.size > 0 && (
              <div className="mass-actions">
                <button className="btn btn-success" onClick={handleMassLaunch}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Start ({selectedIds.size})
                </button>
                <button className="btn btn-secondary" onClick={handleMassStop}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  Stop ({selectedIds.size})
                </button>
              </div>
            )}
            {currentPage === 'profiles' && (
              <>
                <div className="search-box">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    className="input search-input"
                    placeholder="Search profiles..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleCreateProfile}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New Profile
                </button>
              </>
            )}
          </div>
        </header>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading profiles...</p>
          </div>
        ) : currentPage === 'running' && runningCount === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" />
            </svg>
            <h3>No running browsers</h3>
            <p>Start a profile to see it here</p>
          </div>
        ) : (
          <ProfileList
            profiles={displayProfiles}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onEdit={handleEditProfile}
            onDelete={handleDeleteProfile}
            onLaunch={handleLaunchProfile}
            onStop={handleStopProfile}
            onCheckFingerprint={handleCheckFingerprint}
          />
        )}
      </>
    );
  };

  return (
    <div className="app">
      <Sidebar
        totalProfiles={profiles.length}
        runningProfiles={runningCount}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <main className="main-content">
        {renderContent()}
      </main>

      {modalOpen && (
        <ProfileModal
          profile={editingProfile}
          onSave={handleSaveProfile}
          onClose={() => {
            setModalOpen(false);
            setEditingProfile(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
