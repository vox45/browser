import React, { useState, useEffect } from 'react';
import { Profile, Fingerprint } from '../../core/types';
import './ProfileModal.css';

// Screen resolution presets
const SCREEN_PRESETS = [
  { label: '1920x1080 (Full HD)', width: 1920, height: 1080 },
  { label: '1366x768 (HD)', width: 1366, height: 768 },
  { label: '1536x864', width: 1536, height: 864 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1280x720 (HD)', width: 1280, height: 720 },
  { label: '2560x1440 (2K)', width: 2560, height: 1440 },
  { label: '1680x1050', width: 1680, height: 1050 },
  { label: '1600x900', width: 1600, height: 900 },
  { label: '3840x2160 (4K)', width: 3840, height: 2160 },
  { label: '2880x1800 (Retina)', width: 2880, height: 1800 },
  { label: '1920x1200', width: 1920, height: 1200 },
];

const TIMEZONES = [
  'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Amsterdam', 'Europe/Moscow', 'Europe/Kiev', 'Europe/Warsaw', 'Europe/Prague',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Seoul',
  'Asia/Bangkok', 'Asia/Dubai', 'Asia/Kolkata',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
];

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'de-DE', name: 'German' },
  { code: 'fr-FR', name: 'French' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'tr-TR', name: 'Turkish' },
];

const WEBGL_VENDORS = [
  'Google Inc. (Intel)',
  'Google Inc. (NVIDIA)',
  'Google Inc. (AMD)',
  'Intel Inc.',
  'NVIDIA Corporation',
  'ATI Technologies Inc.',
];

const WEBGL_RENDERERS = {
  'Google Inc. (Intel)': [
    'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (Intel, Intel(R) Iris(R) Plus Graphics Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (Intel, Intel(R) HD Graphics 530 Direct3D11 vs_5_0 ps_5_0)',
  ],
  'Google Inc. (NVIDIA)': [
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
  ],
  'Google Inc. (AMD)': [
    'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (AMD, AMD Radeon RX 5700 XT Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (AMD, AMD Radeon Vega 8 Graphics Direct3D11 vs_5_0 ps_5_0)',
  ],
  'Intel Inc.': [
    'Intel Iris OpenGL Engine',
    'Intel HD Graphics 6000 OpenGL Engine',
  ],
  'NVIDIA Corporation': [
    'NVIDIA GeForce GT 750M OpenGL Engine',
    'NVIDIA GeForce GTX 680MX OpenGL Engine',
  ],
  'ATI Technologies Inc.': [
    'AMD Radeon Pro 5500M OpenGL Engine',
    'AMD Radeon Pro 560X OpenGL Engine',
  ],
};

interface ProfileWithStatus extends Profile {
  isRunning: boolean;
}

interface ProfileModalProps {
  profile: ProfileWithStatus | null;
  onSave: (data: {
    name: string;
    os: string;
    proxy: string;
    notes: string;
    screenResolution?: { width: number; height: number };
    fingerprint?: Partial<Fingerprint>;
    startHomepage: boolean;
    homepageUrl: string;
  }) => void;
  onClose: () => void;
}

type Tab = 'general' | 'fingerprint' | 'hardware' | 'advanced';

export function ProfileModal({ profile, onSave, onClose }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [name, setName] = useState(profile?.name || '');
  const [os, setOs] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [proxy, setProxy] = useState('');
  const [notes, setNotes] = useState(profile?.notes || '');
  const [proxyStatus, setProxyStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({ testing: false });

  // Start homepage settings
  const [startHomepage, setStartHomepage] = useState(false);
  const [homepageUrl, setHomepageUrl] = useState('https://www.google.com');

  // Screen resolution (separate from fingerprint)
  const [screenWidth, setScreenWidth] = useState(1920);
  const [screenHeight, setScreenHeight] = useState(1080);

  // Fingerprint settings
  const [fingerprint, setFingerprint] = useState<Fingerprint | null>(null);
  const [userAgent, setUserAgent] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('America/New_York');
  const [webglVendor, setWebglVendor] = useState('Google Inc. (Intel)');
  const [webglRenderer, setWebglRenderer] = useState('');
  const [hardwareConcurrency, setHardwareConcurrency] = useState(8);
  const [deviceMemory, setDeviceMemory] = useState(8);
  const [platform, setPlatform] = useState('Win32');
  const [doNotTrack, setDoNotTrack] = useState<string | null>('1');
  const [canvasNoise, setCanvasNoise] = useState(0.0005);
  const [webglNoise, setWebglNoise] = useState(0.1);
  const [audioNoise, setAudioNoise] = useState(0.0001);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setNotes(profile.notes);
      setFingerprint(profile.fingerprint);
      setStartHomepage(profile.startHomepage || false);
      setHomepageUrl(profile.homepageUrl || 'https://www.google.com');

      // Set individual fields from fingerprint
      const fp = profile.fingerprint;
      setUserAgent(fp.userAgent);
      setLanguage(fp.language);
      setTimezone(fp.timezone);
      setWebglVendor(fp.webgl.vendor);
      setWebglRenderer(fp.webgl.unmaskedRenderer);
      setHardwareConcurrency(fp.hardwareConcurrency);
      setDeviceMemory(fp.deviceMemory);
      setPlatform(fp.platform);
      setDoNotTrack(fp.doNotTrack);
      setCanvasNoise(fp.canvas.noise);
      setWebglNoise(fp.webgl.noise);
      setAudioNoise(fp.audio.noise);
      setScreenWidth(fp.screen.width);
      setScreenHeight(fp.screen.height);

      if (profile.proxy) {
        const { type, host, port, username, password } = profile.proxy;
        if (username && password) {
          setProxy(`${type}://${username}:${password}@${host}:${port}`);
        } else {
          setProxy(`${type}://${host}:${port}`);
        }
      }
    } else {
      generateNewFingerprint();
    }
  }, [profile]);

  const generateNewFingerprint = async () => {
    try {
      const fp = await window.api.generateFingerprint({ os });
      setFingerprint(fp);
      setUserAgent(fp.userAgent);
      setLanguage(fp.language);
      setTimezone(fp.timezone);
      setWebglVendor(fp.webgl.vendor);
      setWebglRenderer(fp.webgl.unmaskedRenderer);
      setHardwareConcurrency(fp.hardwareConcurrency);
      setDeviceMemory(fp.deviceMemory);
      setPlatform(fp.platform);
      setDoNotTrack(fp.doNotTrack);
      setCanvasNoise(fp.canvas.noise);
      setWebglNoise(fp.webgl.noise);
      setAudioNoise(fp.audio.noise);
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
    }
  };

  const handleOsChange = async (newOs: 'windows' | 'macos' | 'linux') => {
    setOs(newOs);
    setPlatform(newOs === 'windows' ? 'Win32' : newOs === 'macos' ? 'MacIntel' : 'Linux x86_64');
    if (!profile) {
      const fp = await window.api.generateFingerprint({ os: newOs });
      setFingerprint(fp);
      setUserAgent(fp.userAgent);
      setWebglVendor(fp.webgl.vendor);
      setWebglRenderer(fp.webgl.unmaskedRenderer);
    }
  };

  const handleWebglVendorChange = (vendor: string) => {
    setWebglVendor(vendor);
    const renderers = WEBGL_RENDERERS[vendor as keyof typeof WEBGL_RENDERERS] || [];
    if (renderers.length > 0) {
      setWebglRenderer(renderers[0]);
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

    // Build updated fingerprint
    const updatedFingerprint = fingerprint ? {
      ...fingerprint,
      userAgent,
      language,
      languages: [language, language.split('-')[0]],
      timezone,
      platform,
      hardwareConcurrency,
      deviceMemory,
      doNotTrack,
      screen: {
        ...fingerprint.screen,
        width: screenWidth,
        height: screenHeight,
        availWidth: screenWidth,
        availHeight: screenHeight - 40,
      },
      webgl: {
        ...fingerprint.webgl,
        vendor: webglVendor,
        unmaskedVendor: webglVendor,
        unmaskedRenderer: webglRenderer,
        noise: webglNoise,
      },
      canvas: {
        ...fingerprint.canvas,
        noise: canvasNoise,
      },
      audio: {
        ...fingerprint.audio,
        noise: audioNoise,
      },
    } : undefined;

    onSave({
      name: name.trim(),
      os,
      proxy: proxy.trim(),
      notes: notes.trim(),
      screenResolution: { width: screenWidth, height: screenHeight },
      fingerprint: updatedFingerprint,
      startHomepage,
      homepageUrl: homepageUrl.trim(),
    });
  };

  const renderGeneralTab = () => (
    <>
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

      <div className="form-group">
        <label className="label">Operating System</label>
        <div className="tabs">
          <button type="button" className={`tab ${os === 'windows' ? 'active' : ''}`} onClick={() => handleOsChange('windows')}>
            Windows
          </button>
          <button type="button" className={`tab ${os === 'macos' ? 'active' : ''}`} onClick={() => handleOsChange('macos')}>
            macOS
          </button>
          <button type="button" className={`tab ${os === 'linux' ? 'active' : ''}`} onClick={() => handleOsChange('linux')}>
            Linux
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Screen Resolution</label>
        <div className="form-row">
          <select
            className="select"
            value={`${screenWidth}x${screenHeight}`}
            onChange={e => {
              const [w, h] = e.target.value.split('x').map(Number);
              setScreenWidth(w);
              setScreenHeight(h);
            }}
          >
            {SCREEN_PRESETS.map(preset => (
              <option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row" style={{ marginTop: '8px', gap: '8px' }}>
          <input
            type="number"
            className="input"
            value={screenWidth}
            onChange={e => setScreenWidth(Number(e.target.value))}
            placeholder="Width"
            min={800}
            max={7680}
          />
          <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>x</span>
          <input
            type="number"
            className="input"
            value={screenHeight}
            onChange={e => setScreenHeight(Number(e.target.value))}
            placeholder="Height"
            min={600}
            max={4320}
          />
        </div>
      </div>

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
            placeholder="type://user:pass@host:port"
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
        <label className="label">Notes</label>
        <textarea
          className="input"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes..."
          rows={2}
        />
      </div>

      <div className="form-group">
        <label className="label checkbox-label">
          <input
            type="checkbox"
            checked={startHomepage}
            onChange={e => setStartHomepage(e.target.checked)}
          />
          <span>Open homepage on start</span>
        </label>
        {startHomepage && (
          <input
            type="text"
            className="input"
            value={homepageUrl}
            onChange={e => setHomepageUrl(e.target.value)}
            placeholder="https://www.google.com"
            style={{ marginTop: '8px' }}
          />
        )}
        <p className="form-hint">
          {startHomepage
            ? 'Browser will open this URL when profile starts'
            : 'Browser will open a blank tab when profile starts'}
        </p>
      </div>
    </>
  );

  const renderFingerprintTab = () => (
    <>
      <div className="form-group">
        <label className="label">User Agent</label>
        <textarea
          className="input"
          value={userAgent}
          onChange={e => setUserAgent(e.target.value)}
          rows={2}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Language</label>
          <select className="select" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Timezone</label>
          <select className="select" value={timezone} onChange={e => setTimezone(e.target.value)}>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Platform</label>
          <select className="select" value={platform} onChange={e => setPlatform(e.target.value)}>
            <option value="Win32">Win32</option>
            <option value="Win64">Win64</option>
            <option value="MacIntel">MacIntel</option>
            <option value="Linux x86_64">Linux x86_64</option>
            <option value="Linux armv7l">Linux armv7l</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Do Not Track</label>
          <select className="select" value={doNotTrack || ''} onChange={e => setDoNotTrack(e.target.value || null)}>
            <option value="">Not set</option>
            <option value="1">Enabled (1)</option>
            <option value="0">Disabled (0)</option>
          </select>
        </div>
      </div>
    </>
  );

  const renderHardwareTab = () => (
    <>
      <div className="form-group">
        <label className="label">WebGL Vendor</label>
        <select className="select" value={webglVendor} onChange={e => handleWebglVendorChange(e.target.value)}>
          {WEBGL_VENDORS.map(vendor => (
            <option key={vendor} value={vendor}>{vendor}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="label">WebGL Renderer</label>
        <select className="select" value={webglRenderer} onChange={e => setWebglRenderer(e.target.value)}>
          {(WEBGL_RENDERERS[webglVendor as keyof typeof WEBGL_RENDERERS] || []).map(renderer => (
            <option key={renderer} value={renderer}>{renderer}</option>
          ))}
        </select>
        <input
          type="text"
          className="input"
          value={webglRenderer}
          onChange={e => setWebglRenderer(e.target.value)}
          placeholder="Or enter custom renderer"
          style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px' }}
        />
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">CPU Cores</label>
          <select className="select" value={hardwareConcurrency} onChange={e => setHardwareConcurrency(Number(e.target.value))}>
            {[2, 4, 6, 8, 12, 16, 24, 32].map(n => (
              <option key={n} value={n}>{n} cores</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Device Memory</label>
          <select className="select" value={deviceMemory} onChange={e => setDeviceMemory(Number(e.target.value))}>
            {[2, 4, 8, 16, 32].map(n => (
              <option key={n} value={n}>{n} GB</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );

  const renderAdvancedTab = () => (
    <>
      <div className="form-group">
        <label className="label">Canvas Noise Level</label>
        <div className="slider-group">
          <input
            type="range"
            min="0"
            max="0.01"
            step="0.0001"
            value={canvasNoise}
            onChange={e => setCanvasNoise(Number(e.target.value))}
          />
          <span className="slider-value">{canvasNoise.toFixed(4)}</span>
        </div>
        <p className="form-hint">Higher values = more unique canvas fingerprint</p>
      </div>

      <div className="form-group">
        <label className="label">WebGL Noise Level</label>
        <div className="slider-group">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={webglNoise}
            onChange={e => setWebglNoise(Number(e.target.value))}
          />
          <span className="slider-value">{webglNoise.toFixed(2)}</span>
        </div>
        <p className="form-hint">Adds noise to WebGL readPixels</p>
      </div>

      <div className="form-group">
        <label className="label">Audio Noise Level</label>
        <div className="slider-group">
          <input
            type="range"
            min="0"
            max="0.001"
            step="0.00001"
            value={audioNoise}
            onChange={e => setAudioNoise(Number(e.target.value))}
          />
          <span className="slider-value">{audioNoise.toFixed(5)}</span>
        </div>
        <p className="form-hint">Adds noise to AudioContext fingerprint</p>
      </div>

      <div className="fingerprint-summary">
        <h4>Current Fingerprint Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Screen</span>
            <span className="summary-value">{screenWidth}x{screenHeight}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Language</span>
            <span className="summary-value">{language}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Timezone</span>
            <span className="summary-value">{timezone}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Platform</span>
            <span className="summary-value">{platform}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">CPU</span>
            <span className="summary-value">{hardwareConcurrency} cores</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Memory</span>
            <span className="summary-value">{deviceMemory} GB</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{profile ? 'Edit Profile' : 'New Profile'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-tabs">
            <button type="button" className={`modal-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
              General
            </button>
            <button type="button" className={`modal-tab ${activeTab === 'fingerprint' ? 'active' : ''}`} onClick={() => setActiveTab('fingerprint')}>
              Fingerprint
            </button>
            <button type="button" className={`modal-tab ${activeTab === 'hardware' ? 'active' : ''}`} onClick={() => setActiveTab('hardware')}>
              Hardware
            </button>
            <button type="button" className={`modal-tab ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>
              Advanced
            </button>
          </div>

          <div className="modal-body">
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'fingerprint' && renderFingerprintTab()}
            {activeTab === 'hardware' && renderHardwareTab()}
            {activeTab === 'advanced' && renderAdvancedTab()}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={generateNewFingerprint}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Randomize
            </button>
            <div style={{ flex: 1 }}></div>
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
