import React, { useState, useEffect } from 'react';
import { Profile, Fingerprint } from '../../core/types';

// Screen resolution presets
const SCREEN_PRESETS = [
  { label: '1920×1080 (Full HD)', width: 1920, height: 1080 },
  { label: '1366×768 (HD)', width: 1366, height: 768 },
  { label: '1536×864', width: 1536, height: 864 },
  { label: '1440×900', width: 1440, height: 900 },
  { label: '1280×720 (HD)', width: 1280, height: 720 },
  { label: '2560×1440 (2K)', width: 2560, height: 1440 },
  { label: '1680×1050', width: 1680, height: 1050 },
  { label: '1600×900', width: 1600, height: 900 },
  { label: '3840×2160 (4K)', width: 3840, height: 2160 },
  { label: '2880×1800 (Retina)', width: 2880, height: 1800 },
  { label: '1920×1200', width: 1920, height: 1200 },
];

interface ProfileWithStatus extends Profile {
  isRunning: boolean;
}

interface ProfileModalProps {
  profile: ProfileWithStatus | null;
  onSave: (data: { name: string; os: string; proxy: string; notes: string }) => void;
  onClose: () => void;
}

export function ProfileModal({ profile, onSave, onClose }: ProfileModalProps) {
  const [name, setName] = useState(profile?.name || '');
  const [os, setOs] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [proxy, setProxy] = useState('');
  const [notes, setNotes] = useState(profile?.notes || '');
  const [useRandomScreen, setUseRandomScreen] = useState(true);
  const [screenResolution, setScreenResolution] = useState<{ width: number; height: number }>(SCREEN_PRESETS[0]);
  const [proxyStatus, setProxyStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({ testing: false });
  const [fingerprint, setFingerprint] = useState<Fingerprint | null>(
    profile?.fingerprint || null
  );

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setNotes(profile.notes);
      setFingerprint(profile.fingerprint);
      if (profile.proxy) {
        const { type, host, port, username, password } = profile.proxy;
        if (username && password) {
          setProxy(`${type}://${username}:${password}@${host}:${port}`);
        } else {
          setProxy(`${type}://${host}:${port}`);
        }
      }
    } else {
      // Generate new fingerprint for new profiles
      generateNewFingerprint();
    }
  }, [profile]);

  const generateNewFingerprint = async () => {
    try {
      const screenOption = useRandomScreen ? null : screenResolution;
      const fp = await window.api.generateFingerprint({ os, screen: screenOption });
      setFingerprint(fp);
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
    }
  };

  const handleOsChange = async (newOs: 'windows' | 'macos' | 'linux') => {
    setOs(newOs);
    if (!profile) {
      // Only regenerate for new profiles
      const screenOption = useRandomScreen ? null : screenResolution;
      const fp = await window.api.generateFingerprint({ os: newOs, screen: screenOption });
      setFingerprint(fp);
    }
  };

  const handleScreenChange = async (preset: typeof SCREEN_PRESETS[0]) => {
    setScreenResolution(preset);
    if (!profile) {
      const fp = await window.api.generateFingerprint({ os, screen: preset });
      setFingerprint(fp);
    }
  };

  const handleRandomScreenToggle = async (useRandom: boolean) => {
    setUseRandomScreen(useRandom);
    if (!profile) {
      const screenOption = useRandom ? null : screenResolution;
      const fp = await window.api.generateFingerprint({ os, screen: screenOption });
      setFingerprint(fp);
    }
  };

  const handleTestProxy = async () => {
    if (!proxy.trim()) return;

    setProxyStatus({ testing: true });

    try {
      const result = await window.api.testProxy(proxy);
      setProxyStatus({
        testing: false,
        success: result.success,
        message: result.success
          ? `Connected! IP: ${result.ip || 'Unknown'} (${result.latency}ms)`
          : result.error || 'Connection failed',
      });
    } catch (error: any) {
      setProxyStatus({
        testing: false,
        success: false,
        message: error.message,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      os,
      proxy: proxy.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{profile ? 'Edit Profile' : 'New Profile'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="label">Profile Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter profile name"
                autoFocus
                required
              />
            </div>

            {!profile && (
              <div className="form-group">
                <label className="label">Operating System</label>
                <div className="tabs">
                  <button
                    type="button"
                    className={`tab ${os === 'windows' ? 'active' : ''}`}
                    onClick={() => handleOsChange('windows')}
                  >
                    🪟 Windows
                  </button>
                  <button
                    type="button"
                    className={`tab ${os === 'macos' ? 'active' : ''}`}
                    onClick={() => handleOsChange('macos')}
                  >
                    🍎 macOS
                  </button>
                  <button
                    type="button"
                    className={`tab ${os === 'linux' ? 'active' : ''}`}
                    onClick={() => handleOsChange('linux')}
                  >
                    🐧 Linux
                  </button>
                </div>
              </div>
            )}

            {!profile && (
              <div className="form-group">
                <label className="label">Screen Resolution</label>
                <div className="screen-resolution-group">
                  <label className="checkbox-label" style={{ marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={useRandomScreen}
                      onChange={e => handleRandomScreenToggle(e.target.checked)}
                    />
                    <span>Random (recommended for uniqueness)</span>
                  </label>
                  {!useRandomScreen && (
                    <select
                      className="input"
                      value={`${screenResolution.width}x${screenResolution.height}`}
                      onChange={e => {
                        const [w, h] = e.target.value.split('x').map(Number);
                        const preset = SCREEN_PRESETS.find(p => p.width === w && p.height === h);
                        if (preset) handleScreenChange(preset);
                      }}
                    >
                      {SCREEN_PRESETS.map(preset => (
                        <option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="label">Proxy (optional)</label>
              <div className="proxy-input-group">
                <input
                  type="text"
                  className="input"
                  value={proxy}
                  onChange={e => {
                    setProxy(e.target.value);
                    setProxyStatus({ testing: false });
                  }}
                  placeholder="host:port or user:pass@host:port"
                />
                <button
                  type="button"
                  className="btn btn-secondary proxy-test-btn"
                  onClick={handleTestProxy}
                  disabled={!proxy.trim() || proxyStatus.testing}
                >
                  {proxyStatus.testing ? 'Testing...' : 'Test'}
                </button>
              </div>
              {proxyStatus.message && (
                <div className={`proxy-status ${proxyStatus.success ? 'success' : 'error'}`}>
                  {proxyStatus.success ? '✓' : '✗'} {proxyStatus.message}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label">Notes (optional)</label>
              <textarea
                className="input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this profile..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            {fingerprint && (
              <div className="fingerprint-preview">
                <h4>Fingerprint Preview</h4>
                <div className="fingerprint-item">
                  <span className="label">User Agent</span>
                  <span className="value" title={fingerprint.userAgent}>
                    {fingerprint.userAgent.slice(0, 50)}...
                  </span>
                </div>
                <div className="fingerprint-item">
                  <span className="label">Screen</span>
                  <span className="value">
                    {fingerprint.screen.width}x{fingerprint.screen.height}
                  </span>
                </div>
                <div className="fingerprint-item">
                  <span className="label">Language</span>
                  <span className="value">{fingerprint.language}</span>
                </div>
                <div className="fingerprint-item">
                  <span className="label">Timezone</span>
                  <span className="value">{fingerprint.timezone}</span>
                </div>
                <div className="fingerprint-item">
                  <span className="label">WebGL Renderer</span>
                  <span className="value" title={fingerprint.webgl.unmaskedRenderer}>
                    {fingerprint.webgl.unmaskedRenderer.slice(0, 30)}...
                  </span>
                </div>
                <div className="fingerprint-item">
                  <span className="label">CPU Cores</span>
                  <span className="value">{fingerprint.hardwareConcurrency}</span>
                </div>
                <div className="fingerprint-item">
                  <span className="label">Memory</span>
                  <span className="value">{fingerprint.deviceMemory} GB</span>
                </div>
              </div>
            )}

            {!profile && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={generateNewFingerprint}
                style={{ marginTop: '12px', width: '100%' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Regenerate Fingerprint
              </button>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              {profile ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
