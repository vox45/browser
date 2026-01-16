import React, { useState, useEffect, useMemo } from 'react';
import { Profile } from '../../core/types';
import './AutomationPage.css';

// Default queries list for reference
const DEFAULT_QUERIES = [
  'weather today', 'latest news', 'best movies 2024', 'top songs', 'stock market today',
  'recipe ideas', 'travel destinations', 'fitness tips', 'technology news', 'sports scores',
  'how to learn programming', 'best smartphones 2024', 'healthy recipes', 'gaming news',
  'movie reviews', 'book recommendations', 'home improvement tips', 'car reviews',
  'fashion trends', 'science news', 'history facts', 'art museums', 'music festivals',
  'pet care tips', 'gardening advice', 'cooking techniques', 'workout routines',
  'meditation benefits', 'language learning apps', 'photography tips', 'video editing',
  'podcast recommendations', 'streaming services', 'smart home devices', 'electric cars',
  'climate change', 'space exploration', 'artificial intelligence', 'virtual reality',
  'cybersecurity tips', 'remote work tools', 'productivity apps', 'online courses',
  'investment strategies', 'cryptocurrency news', 'real estate market', 'job search tips',
  'interview preparation', 'resume writing', 'salary negotiation', 'career advice',
  'mental health tips', 'stress management', 'sleep improvement', 'nutrition advice',
  'weight loss tips', 'muscle building', 'yoga poses', 'running tips', 'cycling routes',
  'hiking trails', 'camping gear', 'fishing spots', 'hunting regulations', 'bird watching',
  'astronomy basics', 'chemistry experiments', 'physics concepts', 'math problems',
  'english grammar', 'spanish vocabulary', 'french phrases', 'german words',
  'japanese characters', 'chinese culture', 'korean music', 'indian cuisine',
  'mexican food', 'italian pasta', 'greek mythology', 'roman history',
  'world war history', 'ancient civilizations', 'medieval times', 'renaissance art',
  'modern architecture', 'interior design', 'landscape photography', 'portrait tips',
  'digital marketing', 'social media strategy', 'content creation', 'brand building',
  'startup ideas', 'business planning', 'financial planning', 'tax preparation',
  'insurance options', 'retirement planning', 'estate planning', 'legal advice',
  'immigration process', 'visa requirements', 'passport renewal', 'travel insurance',
  'flight booking', 'hotel deals', 'car rental', 'cruise vacations', 'beach resorts',
  'mountain retreats', 'city tours', 'cultural experiences', 'adventure sports',
  'water activities', 'winter sports', 'summer activities', 'spring festivals',
];

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

interface AutomationPageProps {
  profiles: ProfileWithStatus[];
}

export function AutomationPage({ profiles }: AutomationPageProps) {
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
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showQueryViewer, setShowQueryViewer] = useState(false);

  // Calculate query statistics
  const queryStats = useMemo(() => {
    const customList = customQueries.trim()
      ? customQueries.split('\n').map(q => q.trim()).filter(q => q.length > 0)
      : [];
    const usingCustom = customList.length > 0;
    const availableQueries = usingCustom ? customList : DEFAULT_QUERIES;
    const totalAvailable = availableQueries.length;

    // Calculate required queries per profile
    const queriesPerProfile = config.desktopSearches + config.mobileSearches;
    const totalRequired = selectedProfiles.size * queriesPerProfile;

    // Check if we have enough
    const hasEnough = totalAvailable >= queriesPerProfile; // At least enough for one profile rotation
    const efficiency = queriesPerProfile > 0 ? Math.floor(totalAvailable / queriesPerProfile) : 0;

    return {
      usingCustom,
      totalAvailable,
      queriesPerProfile,
      totalRequired,
      hasEnough,
      efficiency, // How many profiles can use unique queries
      queries: availableQueries,
    };
  }, [customQueries, config.desktopSearches, config.mobileSearches, selectedProfiles.size]);

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
        setCustomQueries(queries.join('\n'));
        setShowQueryEditor(true);
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
        setCustomQueries(queries.join('\n'));
        setShowQueryEditor(true);
      } catch (error) {
        console.error('Failed to read file:', error);
      }
    }
    // Reset input
    e.target.value = '';
  };

  // Listen for farming progress updates
  useEffect(() => {
    const handleProgress = (_event: any, data: Partial<FarmingProgress>) => {
      setProgress(prev => {
        // Accumulate log messages instead of replacing, limit to last 100
        let newLog = prev.log;
        if (data.log && data.log.length > 0) {
          newLog = [...prev.log, ...data.log].slice(-100);
        }

        return {
          ...prev,
          ...data,
          log: newLog,
        };
      });
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
      case 'desktop': return 'Desktop Searches';
      case 'mobile': return 'Mobile Searches';
      case 'daily': return 'Daily Set';
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

  return (
    <div className="automation-page">
      <div className="automation-header">
        <h1>Bing Rewards Farming</h1>
        <p className="automation-subtitle">
          Automate Bing searches and daily set collection for Microsoft Rewards
        </p>
      </div>

      <div className="automation-content">
        {/* Configuration Panel */}
        <div className="config-panel">
          <h2>Configuration</h2>

          <div className="config-section">
            <h3>Search Settings</h3>

            <div className="config-row">
              <label>Desktop Searches</label>
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
              <label>Mobile Searches</label>
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
                <span className="checkbox-text">Collect Daily Set</span>
              </label>
            </div>
          </div>

          <div className="config-section">
            <div className="section-header">
              <h3>Query Manager</h3>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setShowQueryEditor(!showQueryEditor)}
              >
                {showQueryEditor ? 'Hide' : 'Edit'}
              </button>
            </div>

            {/* Query Stats Summary */}
            <div className="query-stats">
              <div className="query-stat-row">
                <span className="stat-label">Available:</span>
                <span className={`stat-value ${queryStats.usingCustom ? 'custom' : ''}`}>
                  {queryStats.totalAvailable} {queryStats.usingCustom ? '(custom)' : '(default)'}
                </span>
              </div>
              <div className="query-stat-row">
                <span className="stat-label">Per profile:</span>
                <span className="stat-value">{queryStats.queriesPerProfile}</span>
              </div>
              {selectedProfiles.size > 0 && (
                <div className="query-stat-row">
                  <span className="stat-label">Total needed:</span>
                  <span className={`stat-value ${queryStats.totalRequired > queryStats.totalAvailable ? 'warning' : ''}`}>
                    {queryStats.totalRequired}
                  </span>
                </div>
              )}
              <div className="query-stat-row">
                <span className="stat-label">Unique sets:</span>
                <span className="stat-value">{queryStats.efficiency} profiles</span>
              </div>
              {selectedProfiles.size > 0 && queryStats.totalRequired > queryStats.totalAvailable && (
                <div className="query-warning">
                  ⚠️ Queries will be reused across profiles
                </div>
              )}
              <button
                className="btn btn-small btn-secondary view-queries-btn"
                onClick={() => setShowQueryViewer(true)}
              >
                View All Queries
              </button>
            </div>

            {showQueryEditor && (
              <div className="query-editor">
                {/* Drop zone */}
                <div
                  className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="drop-zone-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17,8 12,3 7,8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p>Drag & drop .txt file here</p>
                    <span>or</span>
                    <label className="btn btn-small btn-secondary file-btn">
                      Browse file
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                <textarea
                  value={customQueries}
                  onChange={e => setCustomQueries(e.target.value)}
                  placeholder="Enter custom search queries (one per line)&#10;Leave empty to use default queries"
                  rows={8}
                  disabled={progress.status === 'running'}
                />
                <div className="query-footer">
                  <p className="query-hint">
                    {queryStats.usingCustom
                      ? `${queryStats.totalAvailable} custom queries loaded`
                      : `Using ${queryStats.totalAvailable} default queries`}
                  </p>
                  {customQueries.trim() && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setCustomQueries('')}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Query Viewer Modal */}
          {showQueryViewer && (
            <div className="query-viewer-overlay" onClick={() => setShowQueryViewer(false)}>
              <div className="query-viewer-modal" onClick={e => e.stopPropagation()}>
                <div className="query-viewer-header">
                  <h3>
                    {queryStats.usingCustom ? 'Custom' : 'Default'} Queries ({queryStats.totalAvailable})
                  </h3>
                  <button className="close-btn" onClick={() => setShowQueryViewer(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="query-viewer-content">
                  {queryStats.queries.map((query, index) => (
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

        {/* Profile Selection */}
        <div className="profiles-panel">
          <div className="panel-header">
            <h2>Select Profiles ({selectedProfiles.size}/{availableProfiles.length})</h2>
            <div className="panel-actions">
              <button className="btn btn-small btn-secondary" onClick={selectAll} disabled={progress.status === 'running'}>
                Select All
              </button>
              <button className="btn btn-small btn-secondary" onClick={deselectAll} disabled={progress.status === 'running'}>
                Deselect All
              </button>
            </div>
          </div>

          <div className="profile-list">
            {availableProfiles.length === 0 ? (
              <div className="no-profiles">
                <p>No profiles available</p>
                <span>Create profiles first or close running browsers</span>
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
                      <span className="status-badge running">
                        {getPhaseLabel(progress.currentPhase)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progress Panel */}
        <div className="progress-panel">
          <h2>Progress</h2>

          <div className={`status-indicator ${getStatusClass(progress.status)}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {progress.status === 'idle' && 'Ready to start'}
              {progress.status === 'running' && 'Farming in progress...'}
              {progress.status === 'completed' && 'Farming completed!'}
              {progress.status === 'error' && `Error: ${progress.error}`}
            </span>
          </div>

          {progress.status === 'running' && (
            <div className="progress-details">
              <div className="progress-item">
                <span className="progress-label">Profiles</span>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${(progress.completedProfiles / progress.totalProfiles) * 100}%` }}
                  ></div>
                </div>
                <span className="progress-value">{progress.completedProfiles}/{progress.totalProfiles}</span>
              </div>

              {progress.currentPhase === 'desktop' && (
                <div className="progress-item">
                  <span className="progress-label">Desktop</span>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${(progress.completedDesktop / config.desktopSearches) * 100}%` }}
                    ></div>
                  </div>
                  <span className="progress-value">{progress.completedDesktop}/{config.desktopSearches}</span>
                </div>
              )}

              {progress.currentPhase === 'mobile' && (
                <div className="progress-item">
                  <span className="progress-label">Mobile</span>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${(progress.completedMobile / config.mobileSearches) * 100}%` }}
                    ></div>
                  </div>
                  <span className="progress-value">{progress.completedMobile}/{config.mobileSearches}</span>
                </div>
              )}

              {progress.currentPhase === 'daily' && (
                <div className="progress-item">
                  <span className="progress-label">Daily Set</span>
                  <span className="progress-value">
                    {progress.dailySetCompleted ? 'Completed' : 'In progress...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Log Output */}
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

          {/* Action Buttons */}
          <div className="action-buttons">
            {progress.status === 'running' ? (
              <button className="btn btn-danger btn-large" onClick={stopFarming}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                Stop Farming
              </button>
            ) : (
              <button
                className="btn btn-primary btn-large"
                onClick={startFarming}
                disabled={selectedProfiles.size === 0}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Start Farming ({selectedProfiles.size} profiles)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
