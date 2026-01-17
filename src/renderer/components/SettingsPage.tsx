import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import './SettingsPage.css';

export function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState({
    startPage: 'https://www.google.com',
    closeAction: 'minimize', // 'minimize' | 'close'
    language: language,
    theme: 'dark',
  });
  const [isClearing, setIsClearing] = useState(false);

  // Sync settings.language with context language
  useEffect(() => {
    setSettings(prev => ({ ...prev, language }));
  }, [language]);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'language' && (value === 'en' || value === 'ru')) {
      setLanguage(value as Language);
    }
  };

  const handleSave = () => {
    localStorage.setItem('antidetect-settings', JSON.stringify(settings));
    alert(t('settingsSaved'));
  };

  const handleClearAllData = async () => {
    if (!confirm(t('clearAllDataConfirm'))) return;

    setIsClearing(true);
    try {
      const result = await window.api.clearAllData();
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        alert(t('clearAllDataSuccess'));
        // Clear local storage too
        localStorage.removeItem('antidetect-settings');
        // Reload the app
        window.location.reload();
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="header">
        <div className="header-left">
          <h1>{t('settingsTitle')}</h1>
        </div>
      </header>

      <div className="settings-content">
        <div className="settings-section">
          <h2>{t('generalSettings')}</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">{t('defaultStartPage')}</label>
              <p className="setting-description">{t('defaultStartPageDesc')}</p>
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
              <label className="setting-label">{t('onClose')}</label>
              <p className="setting-description">{t('onCloseDesc')}</p>
            </div>
            <select
              className="select setting-select"
              value={settings.closeAction}
              onChange={e => handleChange('closeAction', e.target.value)}
            >
              <option value="minimize">{t('minimizeToTray')}</option>
              <option value="close">{t('closeApp')}</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">{t('interfaceLanguage')}</label>
              <p className="setting-description">{t('interfaceLanguageDesc')}</p>
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
          <h2>{t('appearance')}</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">{t('theme')}</label>
              <p className="setting-description">{t('themeDesc')}</p>
            </div>
            <select
              className="select setting-select"
              value={settings.theme}
              onChange={e => handleChange('theme', e.target.value)}
            >
              <option value="dark">{t('dark')}</option>
              <option value="light">{t('lightComingSoon')}</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>{t('browser')}</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">{t('chromePath')}</label>
              <p className="setting-description">{t('chromePathDesc')}</p>
            </div>
            <input
              type="text"
              className="input setting-input"
              placeholder={t('autoDetect')}
              disabled
            />
          </div>
        </div>

        <div className="settings-section">
          <h2>{t('data')}</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">{t('profilesLocation')}</label>
              <p className="setting-description">{t('profilesLocationDesc')}</p>
            </div>
            <div className="setting-value">
              <code>%APPDATA%\antidetect-browser\browser_profiles</code>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">{t('clearAllData')}</label>
              <p className="setting-description">{t('clearAllDataDesc')}</p>
            </div>
            <button
              className="btn btn-danger"
              onClick={handleClearAllData}
              disabled={isClearing}
            >
              {isClearing ? t('loading') : t('clearAllData')}
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            {t('saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
}
