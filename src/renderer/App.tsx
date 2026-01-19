import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ProfileList } from './components/ProfileList';
import { ProfileModal } from './components/ProfileModal';
import { SettingsPage } from './components/SettingsPage';
import { FingerprintTestModal } from './components/FingerprintTestModal';
import { AutomationPage } from './components/AutomationPage';
import { useLanguage } from './i18n/LanguageContext';
import { Profile, ProfileGroup } from '../core/types';
import './styles/app.css';

interface ProfileWithStatus extends Profile {
  isRunning: boolean;
}

type Page = 'profiles' | 'running' | 'automation' | 'settings';

function App() {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<ProfileWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileWithStatus | null>(null);
  const [testingProfile, setTestingProfile] = useState<ProfileWithStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<Page>('profiles');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk create modal
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPrefix, setBulkPrefix] = useState('Profile');
  const [bulkOs, setBulkOs] = useState<'windows' | 'macos' | 'linux'>('windows');

  // Import/Export
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Groups
  const [groups, setGroups] = useState<ProfileGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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

  const loadGroups = useCallback(async () => {
    try {
      const data = await window.api.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
    loadGroups();
    const interval = setInterval(loadProfiles, 3000);
    return () => clearInterval(interval);
  }, [loadProfiles, loadGroups]);

  // Bulk create handler
  const handleBulkCreate = async () => {
    try {
      const result = await window.api.bulkCreateProfiles({
        count: bulkCount,
        namePrefix: bulkPrefix,
        os: bulkOs,
      });
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        setShowBulkCreate(false);
        loadProfiles();
        alert(`${t('success')}: Created ${result.count} profiles`);
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('bulkDeleteConfirm').replace('{count}', String(selectedIds.size)))) return;

    try {
      const result = await window.api.bulkDeleteProfiles(Array.from(selectedIds));
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        setSelectedIds(new Set());
        loadProfiles();
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`);
    }
  };

  // Export all profiles
  const handleExportAll = async () => {
    try {
      const result = await window.api.exportAllProfiles();
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else if (result.data) {
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profiles-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`);
    }
  };

  // Import profiles
  const handleImport = async () => {
    if (!importJson.trim()) return;

    try {
      const result = await window.api.importProfiles(importJson);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        setShowImportModal(false);
        setImportJson('');
        loadProfiles();
        alert(t('importSuccess').replace('{count}', String(result.count)));
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`);
    }
  };

  // Handle file import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        setImportJson(text);
      } catch (error) {
        console.error('Failed to read file:', error);
      }
    }
    e.target.value = '';
  };

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setModalOpen(true);
  };

  const handleEditProfile = (profile: ProfileWithStatus) => {
    setEditingProfile(profile);
    setModalOpen(true);
  };

  const handleTestFingerprint = (profile: ProfileWithStatus) => {
    setTestingProfile(profile);
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
    screenResolution?: { width: number; height: number };
    fingerprint?: Partial<Profile['fingerprint']>;
    startHomepage: boolean;
    homepageUrl: string;
  }) => {
    try {
      if (editingProfile) {
        const result = await window.api.updateProfile({
          id: editingProfile.id,
          name: data.name,
          notes: data.notes,
          proxy: data.proxy || null,
          fingerprint: data.fingerprint,
          startHomepage: data.startHomepage,
          homepageUrl: data.homepageUrl,
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
          fingerprint: data.fingerprint,
          startHomepage: data.startHomepage,
          homepageUrl: data.homepageUrl,
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

    if (currentPage === 'automation') {
      return <AutomationPage profiles={profiles} />;
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
                  {t('start')} ({selectedIds.size})
                </button>
                <button className="btn btn-secondary" onClick={handleMassStop}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  {t('stop')} ({selectedIds.size})
                </button>
                <button className="btn btn-danger" onClick={handleBulkDelete}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  {t('delete')} ({selectedIds.size})
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
                    placeholder={t('searchProfiles')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="btn btn-secondary" onClick={() => setShowImportModal(true)} title={t('importProfiles')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <button className="btn btn-secondary" onClick={handleExportAll} title={t('exportAll')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
                <button className="btn btn-secondary" onClick={() => setShowBulkCreate(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  {t('bulkCreate')}
                </button>
                <button className="btn btn-primary" onClick={handleCreateProfile}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('newProfile')}
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
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10,8 16,12 10,16" fill="currentColor" />
              </svg>
            </div>
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
            onTestFingerprint={handleTestFingerprint}
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

      {testingProfile && (
        <FingerprintTestModal
          profileId={testingProfile.id}
          profileName={testingProfile.name}
          isRunning={testingProfile.isRunning}
          onClose={() => setTestingProfile(null)}
        />
      )}

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <div className="modal-overlay" onClick={() => setShowBulkCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('bulkCreate')}</h2>
              <button className="modal-close" onClick={() => setShowBulkCreate(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t('profileCount')}</label>
                <input
                  type="number"
                  className="input"
                  value={bulkCount}
                  onChange={e => setBulkCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                  min={1}
                  max={100}
                />
              </div>
              <div className="form-group">
                <label>{t('namePrefix')}</label>
                <input
                  type="text"
                  className="input"
                  value={bulkPrefix}
                  onChange={e => setBulkPrefix(e.target.value)}
                  placeholder="Profile"
                />
              </div>
              <div className="form-group">
                <label>{t('operatingSystem')}</label>
                <select
                  className="select"
                  value={bulkOs}
                  onChange={e => setBulkOs(e.target.value as 'windows' | 'macos' | 'linux')}
                >
                  <option value="windows">Windows</option>
                  <option value="macos">macOS</option>
                  <option value="linux">Linux</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkCreate(false)}>
                {t('cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleBulkCreate}>
                {t('bulkCreate')} ({bulkCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('importProfiles')}</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t('selectFile')}</label>
                <label className="btn btn-secondary file-btn">
                  {t('browseFile') || 'Browse file'}
                  <input type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="form-group">
                <label>JSON</label>
                <textarea
                  className="input textarea"
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  placeholder='[{"name": "Profile 1", ...}]'
                  rows={10}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportJson(''); }}>
                {t('cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleImport} disabled={!importJson.trim()}>
                {t('importProfile')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
