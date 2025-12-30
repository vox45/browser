import React, { useState } from 'react';
import './SettingsPage.css';

export function SettingsPage() {
  const [settings, setSettings] = useState({
    startPage: 'https://www.google.com',
    closeAction: 'minimize', // 'minimize' | 'close'
    language: 'en',
    theme: 'dark',
  });

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('antidetect-settings', JSON.stringify(settings));
    alert('Settings saved!');
  };

  return (
    <div className="settings-page">
      <header className="header">
        <div className="header-left">
          <h1>Settings</h1>
        </div>
      </header>

      <div className="settings-content">
        <div className="settings-section">
          <h2>General</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Default Start Page</label>
              <p className="setting-description">URL to open when launching a new browser</p>
            </div>
            <input
              type="text"
              className="input setting-input"
              value={settings.startPage}
              onChange={e => handleChange('startPage', e.target.value)}
              placeholder="https://www.google.com"
            />
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">On Close</label>
              <p className="setting-description">What to do when closing the main window</p>
            </div>
            <select
              className="select setting-select"
              value={settings.closeAction}
              onChange={e => handleChange('closeAction', e.target.value)}
            >
              <option value="minimize">Minimize to tray</option>
              <option value="close">Close application</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Language</label>
              <p className="setting-description">Interface language</p>
            </div>
            <select
              className="select setting-select"
              value={settings.language}
              onChange={e => handleChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Appearance</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Theme</label>
              <p className="setting-description">Application color theme</p>
            </div>
            <select
              className="select setting-select"
              value={settings.theme}
              onChange={e => handleChange('theme', e.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light (coming soon)</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Browser</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Chrome Path</label>
              <p className="setting-description">Path to Chrome/Chromium executable (auto-detected)</p>
            </div>
            <input
              type="text"
              className="input setting-input"
              placeholder="Auto-detect"
              disabled
            />
          </div>
        </div>

        <div className="settings-section">
          <h2>Data</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Profiles Location</label>
              <p className="setting-description">Where browser profiles are stored</p>
            </div>
            <div className="setting-value">
              <code>%APPDATA%\antidetect-browser\browser_profiles</code>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Clear All Data</label>
              <p className="setting-description">Delete all profiles and settings</p>
            </div>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm('Are you sure? This will delete ALL profiles and data!')) {
                  alert('Feature coming soon');
                }
              }}
            >
              Clear All Data
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
