import React, { useState, useEffect } from 'react';
import { Profile, FarmingSchedule, ProfileGroup } from '../../core/types';
import { useLanguage } from '../i18n/LanguageContext';
import './AutomationPage.css';

interface ProfileWithStatus extends Profile {
  isRunning: boolean;
}

interface FarmingConfig {
  desktopSearches: number;
  mobileSearches: number;
  dailySet: boolean;
}

interface FarmingProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentProfile: string | null;
  currentPhase: 'desktop' | 'mobile' | 'daily' | null;
  completedDesktop: number;
  completedMobile: number;
  dailySetCompleted: boolean;
  totalProfiles: number;
  completedProfiles: number;
  error: string | null;
  log: string[];
}

interface QueryStats {
  available: number;
  used: number;
  total: number;
}

interface AutomationPageProps {
  profiles: ProfileWithStatus[];
}

export function AutomationPage({ profiles }: AutomationPageProps) {
  const { t } = useLanguage();
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<FarmingConfig>({
    desktopSearches: 30,
    mobileSearches: 20,
    dailySet: true,
  });
  const [progress, setProgress] = useState<FarmingProgress>({
    status: 'idle',
    currentProfile: null,
    currentPhase: null,
    completedDesktop: 0,
    completedMobile: 0,
    dailySetCompleted: false,
    totalProfiles: 0,
    completedProfiles: 0,
    error: null,
    log: [],
  });
  const [customQueries, setCustomQueries] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showQueryViewer, setShowQueryViewer] = useState(false);

  // Query Manager state (from backend)
  const [queryStats, setQueryStats] = useState<QueryStats>({ available: 0, used: 0, total: 0 });
  const [availableQueries, setAvailableQueries] = useState<string[]>([]);
  const [newQueriesText, setNewQueriesText] = useState('');
  const [showAddQueries, setShowAddQueries] = useState(false);

  // Schedules state
  const [schedules, setSchedules] = useState<FarmingSchedule[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FarmingSchedule | null>(null);
  const [groups, setGroups] = useState<ProfileGroup[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'farming' | 'schedules' | 'queries'>('farming');

  // Load query stats and schedules
  useEffect(() => {
    loadQueryStats();
    loadSchedules();
    loadGroups();
  }, []);

  const loadQueryStats = async () => {
    try {
      const stats = await window.api.getQueryStats();
      setQueryStats(stats);
      const queries = await window.api.getAvailableQueries();
      setAvailableQueries(queries);
    } catch (e) {
      console.error('Failed to load query stats:', e);
    }
  };

  const loadSchedules = async () => {
    try {
      const data = await window.api.getSchedules();
      setSchedules(data);
    } catch (e) {
      console.error('Failed to load schedules:', e);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await window.api.getGroups();
      setGroups(data);
    } catch (e) {
      console.error('Failed to load groups:', e);
    }
  };

  const handleAddQueries = async () => {
    const queries = newQueriesText.split('\n').map(q => q.trim()).filter(q => q.length > 0);
    if (queries.length === 0) return;

    try {
      const result = await window.api.addQueries(queries);
      if ('added' in result) {
        setNewQueriesText('');
        setShowAddQueries(false);
        loadQueryStats();
      }
    } catch (e) {
      console.error('Failed to add queries:', e);
    }
  };

  const handleResetUsedQueries = async () => {
    if (!confirm('Reset all used queries back to available?')) return;
    try {
      await window.api.resetUsedQueries();
      loadQueryStats();
    } catch (e) {
      console.error('Failed to reset queries:', e);
    }
  };

  const handleClearAllQueries = async () => {
    if (!confirm('Delete all queries? This cannot be undone.')) return;
    try {
      await window.api.clearAllQueries();
      loadQueryStats();
    } catch (e) {
      console.error('Failed to clear queries:', e);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm('Reset to default queries? Current queries will be replaced.')) return;
    try {
      await window.api.resetToDefaultQueries();
      loadQueryStats();
    } catch (e) {
      console.error('Failed to reset to default:', e);
    }
  };

  // Handle drag-and-drop for .txt files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const txtFile = files.find(f => f.name.endsWith('.txt'));

    if (txtFile) {
      try {
        const text = await txtFile.text();
        const queries = text.split('\n').map(q => q.trim()).filter(q => q.length > 0);
        // Add to backend
        const result = await window.api.addQueries(queries);
        if ('added' in result) {
          loadQueryStats();
          alert(`Added ${result.added} new queries`);
        }
      } catch (error) {
        console.error('Failed to read file:', error);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.txt')) {
      try {
        const text = await file.text();
        const queries = text.split('\n').map(q => q.trim()).filter(q => q.length > 0);
        // Add to backend
        const result = await window.api.addQueries(queries);
        if ('added' in result) {
          loadQueryStats();
          alert(`Added ${result.added} new queries`);
        }
      } catch (error) {
        console.error('Failed to read file:', error);
      }
    }
    e.target.value = '';
  };

  // Listen for farming progress updates
  useEffect(() => {
    const handleProgress = (_event: any, data: Partial<FarmingProgress>) => {
      setProgress(prev => {
        let newLog = prev.log;
        if (data.log && data.log.length > 0) {
          newLog = [...prev.log, ...data.log].slice(-100);
        }
        return { ...prev, ...data, log: newLog };
      });
      // Reload query stats after farming progress
      if (data.status === 'completed' || data.completedProfiles !== undefined) {
        loadQueryStats();
      }
    };

    window.api.onFarmingProgress?.(handleProgress);
    return () => {
      window.api.offFarmingProgress?.(handleProgress);
    };
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    const logContent = document.querySelector('.log-content');
    if (logContent) {
      logContent.scrollTop = logContent.scrollHeight;
    }
  }, [progress.log]);

  const toggleProfile = (profileId: string) => {
    setSelectedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const notRunning = profiles.filter(p => !p.isRunning).map(p => p.id);
    setSelectedProfiles(new Set(notRunning));
  };

  const deselectAll = () => {
    setSelectedProfiles(new Set());
  };

  const startFarming = async () => {
    if (selectedProfiles.size === 0) {
      alert('Please select at least one profile');
      return;
    }

    const queries = customQueries.trim()
      ? customQueries.split('\n').map(q => q.trim()).filter(q => q.length > 0)
      : undefined;

    setProgress({
      status: 'running',
      currentProfile: null,
      currentPhase: null,
      completedDesktop: 0,
      completedMobile: 0,
      dailySetCompleted: false,
      totalProfiles: selectedProfiles.size,
      completedProfiles: 0,
      error: null,
      log: ['Starting farming session...'],
    });

    try {
      await window.api.startFarming({
        profileIds: Array.from(selectedProfiles),
        config,
        customQueries: queries,
      });
    } catch (error: any) {
      setProgress(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
        log: [...prev.log, `Error: ${error.message}`],
      }));
    }
  };

  const stopFarming = async () => {
    try {
      await window.api.stopFarming();
      setProgress(prev => ({
        ...prev,
        status: 'idle',
        log: [...prev.log, 'Farming stopped by user'],
      }));
    } catch (error: any) {
      console.error('Failed to stop farming:', error);
    }
  };

  const getPhaseLabel = (phase: string | null): string => {
    switch (phase) {
      case 'desktop': return t('desktop') || 'Desktop';
      case 'mobile': return t('mobile') || 'Mobile';
      case 'daily': return t('dailySet') || 'Daily Set';
      default: return 'Preparing...';
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'running': return 'status-running';
      case 'completed': return 'status-completed';
      case 'error': return 'status-error';
      default: return 'status-idle';
    }
  };

  const availableProfiles = profiles.filter(p => !p.isRunning);
  const queriesPerProfile = config.desktopSearches + config.mobileSearches;

  // Schedule handlers
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm(t('deleteScheduleConfirm') || 'Delete this schedule?')) return;
    try {
      await window.api.deleteSchedule(id);
      loadSchedules();
    } catch (e) {
      console.error('Failed to delete schedule:', e);
    }
  };

  const handleToggleSchedule = async (schedule: FarmingSchedule) => {
    try {
      await window.api.updateSchedule({
        ...schedule,
        schedule: { ...schedule.schedule, enabled: !schedule.schedule.enabled }
      });
      loadSchedules();
    } catch (e) {
      console.error('Failed to toggle schedule:', e);
    }
  };

  const getDayNames = (days: number[]) => {
    const names = [t('sunday') || 'Sun', t('monday') || 'Mon', t('tuesday') || 'Tue',
                   t('wednesday') || 'Wed', t('thursday') || 'Thu', t('friday') || 'Fri', t('saturday') || 'Sat'];
    return days.map(d => names[d]).join(', ');
  };

  // Render Farming Tab
  const renderFarmingTab = () => (
    <div className="automation-content">
      <div className="config-panel">
        <h2>{t('configuration') || 'Configuration'}</h2>

        <div className="config-section">
          <h3>{t('searchSettings') || 'Search Settings'}</h3>

          <div className="config-row">
            <label>{t('desktopSearches')}</label>
            <div className="config-input-group">
              <input
                type="range"
                min="0"
                max="50"
                value={config.desktopSearches}
                onChange={e => setConfig(prev => ({ ...prev, desktopSearches: Number(e.target.value) }))}
                disabled={progress.status === 'running'}
              />
              <span className="config-value">{config.desktopSearches}</span>
            </div>
          </div>

          <div className="config-row">
            <label>{t('mobileSearches')}</label>
            <div className="config-input-group">
              <input
                type="range"
                min="0"
                max="30"
                value={config.mobileSearches}
                onChange={e => setConfig(prev => ({ ...prev, mobileSearches: Number(e.target.value) }))}
                disabled={progress.status === 'running'}
              />
              <span className="config-value">{config.mobileSearches}</span>
            </div>
          </div>

          <div className="config-row checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.dailySet}
                onChange={e => setConfig(prev => ({ ...prev, dailySet: e.target.checked }))}
                disabled={progress.status === 'running'}
              />
              <span className="checkbox-text">{t('dailySet')}</span>
            </label>
          </div>
        </div>

        <div className="config-section">
          <h3>{t('queryDatabase') || 'Query Database'}</h3>
          <div className="query-stats">
            <div className="query-stat-row">
              <span className="stat-label">{t('available') || 'Available'}:</span>
              <span className="stat-value">{queryStats.available}</span>
            </div>
            <div className="query-stat-row">
              <span className="stat-label">{t('used') || 'Used'}:</span>
              <span className="stat-value">{queryStats.used}</span>
            </div>
            <div className="query-stat-row">
              <span className="stat-label">{t('perProfile') || 'Per profile'}:</span>
              <span className="stat-value">{queriesPerProfile}</span>
            </div>
            {queryStats.available < queriesPerProfile && queryStats.available > 0 && (
              <div className="query-warning">⚠️ Not enough queries, will be reused</div>
            )}
            {queryStats.available === 0 && (
              <div className="query-warning">⚠️ No queries! Reset to default</div>
            )}
          </div>
        </div>
      </div>

      <div className="profiles-panel">
        <div className="panel-header">
          <h2>{t('selectProfiles')} ({selectedProfiles.size}/{availableProfiles.length})</h2>
          <div className="panel-actions">
            <button className="btn btn-small btn-secondary" onClick={selectAll} disabled={progress.status === 'running'}>
              {t('selectAll')}
            </button>
            <button className="btn btn-small btn-secondary" onClick={deselectAll} disabled={progress.status === 'running'}>
              Deselect
            </button>
          </div>
        </div>

        <div className="profile-list">
          {availableProfiles.length === 0 ? (
            <div className="no-profiles">
              <p>{t('noProfilesForFarming')}</p>
            </div>
          ) : (
            availableProfiles.map(profile => (
              <div
                key={profile.id}
                className={`profile-item ${selectedProfiles.has(profile.id) ? 'selected' : ''} ${
                  progress.currentProfile === profile.id ? 'active' : ''
                }`}
                onClick={() => progress.status !== 'running' && toggleProfile(profile.id)}
              >
                <div className="profile-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedProfiles.has(profile.id)}
                    onChange={() => {}}
                    disabled={progress.status === 'running'}
                  />
                </div>
                <div className="profile-info">
                  <span className="profile-name">{profile.name}</span>
                  <span className="profile-meta">
                    {profile.fingerprint.platform} • {profile.fingerprint.language}
                  </span>
                </div>
                {progress.currentProfile === profile.id && (
                  <div className="profile-status">
                    <span className="status-badge running">{getPhaseLabel(progress.currentPhase)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="progress-panel">
        <h2>{t('farmingProgress')}</h2>

        <div className={`status-indicator ${getStatusClass(progress.status)}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {progress.status === 'idle' && (t('readyToStart') || 'Ready to start')}
            {progress.status === 'running' && (t('farmingInProgress') || 'Farming in progress...')}
            {progress.status === 'completed' && (t('farmingCompleted') || 'Farming completed!')}
            {progress.status === 'error' && `${t('error')}: ${progress.error}`}
          </span>
        </div>

        {progress.status === 'running' && (
          <div className="progress-details">
            <div className="progress-item">
              <span className="progress-label">{t('profiles') || 'Profiles'}</span>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${(progress.completedProfiles / progress.totalProfiles) * 100}%` }}></div>
              </div>
              <span className="progress-value">{progress.completedProfiles}/{progress.totalProfiles}</span>
            </div>

            {progress.currentPhase === 'desktop' && (
              <div className="progress-item">
                <span className="progress-label">{t('desktop')}</span>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${(progress.completedDesktop / config.desktopSearches) * 100}%` }}></div>
                </div>
                <span className="progress-value">{progress.completedDesktop}/{config.desktopSearches}</span>
              </div>
            )}

            {progress.currentPhase === 'mobile' && (
              <div className="progress-item">
                <span className="progress-label">{t('mobile')}</span>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${(progress.completedMobile / config.mobileSearches) * 100}%` }}></div>
                </div>
                <span className="progress-value">{progress.completedMobile}/{config.mobileSearches}</span>
              </div>
            )}
          </div>
        )}

        {progress.log.length > 0 && (
          <div className="log-output">
            <h3>Log</h3>
            <div className="log-content">
              {progress.log.map((line, index) => (
                <div key={index} className="log-line">{line}</div>
              ))}
            </div>
          </div>
        )}

        <div className="action-buttons">
          {progress.status === 'running' ? (
            <button className="btn btn-danger btn-large" onClick={stopFarming}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              {t('stopFarming')}
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={startFarming} disabled={selectedProfiles.size === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              {t('startFarming')} ({selectedProfiles.size})
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Render Schedules Tab
  const renderSchedulesTab = () => (
    <div className="schedules-content">
      <div className="schedules-header">
        <h2>{t('schedules')}</h2>
        <button className="btn btn-primary" onClick={() => { setEditingSchedule(null); setShowScheduleModal(true); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('newSchedule')}
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="empty-state">
          <h3>{t('noSchedules') || 'No schedules'}</h3>
          <p>{t('noSchedulesDesc') || 'Create a schedule to automate farming'}</p>
        </div>
      ) : (
        <div className="schedules-list">
          {schedules.map(schedule => (
            <div key={schedule.id} className={`schedule-card ${schedule.schedule.enabled ? 'enabled' : 'disabled'}`}>
              <div className="schedule-header">
                <h3>{schedule.name}</h3>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={schedule.schedule.enabled}
                    onChange={() => handleToggleSchedule(schedule)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="schedule-details">
                <div className="schedule-time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {schedule.schedule.time}
                </div>
                <div className="schedule-days">{getDayNames(schedule.schedule.days)}</div>
                <div className="schedule-profiles">{schedule.profileIds.length} {t('profiles') || 'profiles'}</div>
              </div>
              <div className="schedule-config">
                <span>{t('desktop')}: {schedule.config.desktopSearches}</span>
                <span>{t('mobile')}: {schedule.config.mobileSearches}</span>
                {schedule.config.dailySet && <span>{t('dailySet')}</span>}
              </div>
              <div className="schedule-actions">
                <button className="btn btn-small btn-secondary" onClick={() => { setEditingSchedule(schedule); setShowScheduleModal(true); }}>
                  {t('edit')}
                </button>
                <button className="btn btn-small btn-danger" onClick={() => handleDeleteSchedule(schedule.id)}>
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showScheduleModal && (
        <ScheduleModal
          schedule={editingSchedule}
          profiles={profiles}
          groups={groups}
          onSave={async (data) => {
            try {
              if (editingSchedule) {
                await window.api.updateSchedule({ ...editingSchedule, ...data });
              } else {
                await window.api.createSchedule(data);
              }
              loadSchedules();
              setShowScheduleModal(false);
            } catch (e) {
              console.error('Failed to save schedule:', e);
            }
          }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );

  // Render Queries Tab
  const renderQueriesTab = () => (
    <div className="queries-content">
      <div className="queries-header">
        <h2>{t('queryManager') || 'Query Manager'}</h2>
      </div>

      <div className="query-stats-panel">
        <div className="stat-card">
          <span className="stat-number">{queryStats.available}</span>
          <span className="stat-label">{t('available') || 'Available'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{queryStats.used}</span>
          <span className="stat-label">{t('used') || 'Used'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{queryStats.total}</span>
          <span className="stat-label">{t('total') || 'Total'}</span>
        </div>
      </div>

      <div className="query-actions">
        <button className="btn btn-primary" onClick={() => setShowAddQueries(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('addQueries') || 'Add Queries'}
        </button>
        <button className="btn btn-secondary" onClick={handleResetUsedQueries}>
          {t('resetUsed') || 'Reset Used'}
        </button>
        <button className="btn btn-secondary" onClick={handleResetToDefault}>
          {t('resetToDefault') || 'Reset to Default'}
        </button>
        <button className="btn btn-danger" onClick={handleClearAllQueries}>
          {t('clearAll') || 'Clear All'}
        </button>
      </div>

      <div
        className={`drop-zone large ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17,8 12,3 7,8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p>{t('dropQueriesHere') || 'Drag & drop .txt file to add queries'}</p>
        <label className="btn btn-secondary file-btn">
          {t('browseFile') || 'Browse file'}
          <input type="file" accept=".txt" onChange={handleFileInput} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="queries-list-section">
        <h3>{t('availableQueries') || 'Available Queries'} ({availableQueries.length})</h3>
        <div className="queries-list">
          {availableQueries.slice(0, 100).map((query, index) => (
            <div key={index} className="query-item">
              <span className="query-number">{index + 1}</span>
              <span className="query-text">{query}</span>
            </div>
          ))}
          {availableQueries.length > 100 && (
            <div className="query-item more">...and {availableQueries.length - 100} more</div>
          )}
        </div>
      </div>

      {showAddQueries && (
        <div className="modal-overlay" onClick={() => setShowAddQueries(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('addQueries') || 'Add Queries'}</h2>
              <button className="modal-close" onClick={() => setShowAddQueries(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <textarea
                value={newQueriesText}
                onChange={e => setNewQueriesText(e.target.value)}
                placeholder={t('enterQueriesPlaceholder') || 'Enter queries, one per line...'}
                rows={10}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddQueries(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleAddQueries}>{t('add') || 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="automation-page">
      <div className="automation-header">
        <h1>{t('bingFarming')}</h1>
        <div className="automation-tabs">
          <button
            className={`tab ${activeTab === 'farming' ? 'active' : ''}`}
            onClick={() => setActiveTab('farming')}
          >
            {t('farming') || 'Farming'}
          </button>
          <button
            className={`tab ${activeTab === 'schedules' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedules')}
          >
            {t('schedules')}
          </button>
          <button
            className={`tab ${activeTab === 'queries' ? 'active' : ''}`}
            onClick={() => setActiveTab('queries')}
          >
            {t('queries') || 'Queries'}
          </button>
        </div>
      </div>

      {activeTab === 'farming' && renderFarmingTab()}
      {activeTab === 'schedules' && renderSchedulesTab()}
      {activeTab === 'queries' && renderQueriesTab()}

      {showQueryViewer && (
        <div className="query-viewer-overlay" onClick={() => setShowQueryViewer(false)}>
          <div className="query-viewer-modal" onClick={e => e.stopPropagation()}>
            <div className="query-viewer-header">
              <h3>{t('availableQueries') || 'Available Queries'} ({availableQueries.length})</h3>
              <button className="close-btn" onClick={() => setShowQueryViewer(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="query-viewer-content">
              {availableQueries.map((query, index) => (
                <div key={index} className="query-item">
                  <span className="query-number">{index + 1}</span>
                  <span className="query-text">{query}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Schedule Modal Component
interface ScheduleModalProps {
  schedule: FarmingSchedule | null;
  profiles: ProfileWithStatus[];
  groups: ProfileGroup[];
  onSave: (data: Omit<FarmingSchedule, 'id' | 'createdAt' | 'lastRun'>) => void;
  onClose: () => void;
}

function ScheduleModal({ schedule, profiles, groups, onSave, onClose }: ScheduleModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(schedule?.name || '');
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set(schedule?.profileIds || []));
  const [time, setTime] = useState(schedule?.schedule.time || '09:00');
  const [days, setDays] = useState<number[]>(schedule?.schedule.days || [1, 2, 3, 4, 5]);
  const [enabled, setEnabled] = useState(schedule?.schedule.enabled ?? true);
  const [desktopSearches, setDesktopSearches] = useState(schedule?.config.desktopSearches || 30);
  const [mobileSearches, setMobileSearches] = useState(schedule?.config.mobileSearches || 20);
  const [dailySet, setDailySet] = useState(schedule?.config.dailySet ?? true);

  const dayNames = [
    { id: 0, name: t('sunday') || 'Sun' },
    { id: 1, name: t('monday') || 'Mon' },
    { id: 2, name: t('tuesday') || 'Tue' },
    { id: 3, name: t('wednesday') || 'Wed' },
    { id: 4, name: t('thursday') || 'Thu' },
    { id: 5, name: t('friday') || 'Fri' },
    { id: 6, name: t('saturday') || 'Sat' },
  ];

  const toggleDay = (day: number) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const toggleProfile = (id: string) => {
    setSelectedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedProfiles.size === 0 || days.length === 0) return;

    onSave({
      name: name.trim(),
      profileIds: Array.from(selectedProfiles),
      config: { desktopSearches, mobileSearches, dailySet },
      schedule: { enabled, time, days },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal schedule-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{schedule ? t('editSchedule') || 'Edit Schedule' : t('newSchedule')}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>{t('scheduleName')}</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('enterScheduleName') || 'Enter schedule name'}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('scheduleTime')}</label>
              <input
                type="time"
                className="input"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('scheduleDays')}</label>
              <div className="day-selector">
                {dayNames.map(day => (
                  <button
                    key={day.id}
                    type="button"
                    className={`day-btn ${days.includes(day.id) ? 'active' : ''}`}
                    onClick={() => toggleDay(day.id)}
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>{t('desktopSearches')}: {desktopSearches}</label>
              <input
                type="range"
                min="0"
                max="50"
                value={desktopSearches}
                onChange={e => setDesktopSearches(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>{t('mobileSearches')}: {mobileSearches}</label>
              <input
                type="range"
                min="0"
                max="30"
                value={mobileSearches}
                onChange={e => setMobileSearches(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={dailySet}
                  onChange={e => setDailySet(e.target.checked)}
                />
                <span>{t('dailySet')}</span>
              </label>
            </div>

            <div className="form-group">
              <label>{t('selectProfiles')} ({selectedProfiles.size})</label>
              <div className="profile-selector">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    className={`profile-option ${selectedProfiles.has(profile.id) ? 'selected' : ''}`}
                    onClick={() => toggleProfile(profile.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProfiles.has(profile.id)}
                      onChange={() => {}}
                    />
                    <span>{profile.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || selectedProfiles.size === 0 || days.length === 0}
            >
              {schedule ? t('saveChanges') : t('createSchedule') || 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
