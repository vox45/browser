import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { TelegramConfig, BackupConfig, ProfileGroup, ProfileTemplate } from '../../core/types';
import './SettingsPage.css';

interface BackupInfo {
  name: string;
  path: string;
  date: Date;
  size: number;
}

export function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'general' | 'telegram' | 'backup' | 'groups' | 'templates'>('general');

  // General settings
  const [settings, setSettings] = useState({
    startPage: 'https://www.google.com',
    closeAction: 'minimize',
    language: language,
    theme: 'dark',
  });
  const [isClearing, setIsClearing] = useState(false);

  // Telegram settings
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    enabled: false,
    botToken: '',
    chatId: '',
    notifyOnStart: true,
    notifyOnComplete: true,
    notifyOnError: true,
  });
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Backup settings
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    autoBackup: false,
    backupInterval: 'daily',
    maxBackups: 5,
    lastBackup: null,
  });
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  // Groups
  const [groups, setGroups] = useState<ProfileGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');
  const [editingGroup, setEditingGroup] = useState<ProfileGroup | null>(null);

  // Templates
  const [templates, setTemplates] = useState<ProfileTemplate[]>([]);

  // Load settings
  useEffect(() => {
    loadTelegramConfig();
    loadBackupConfig();
    loadBackups();
    loadGroups();
    loadTemplates();
  }, []);

  useEffect(() => {
    setSettings(prev => ({ ...prev, language }));
  }, [language]);

  const loadTelegramConfig = async () => {
    try {
      const config = await window.api.getTelegramConfig();
      setTelegramConfig(config);
    } catch (e) {
      console.error('Failed to load telegram config:', e);
    }
  };

  const loadBackupConfig = async () => {
    try {
      const config = await window.api.getBackupConfig();
      setBackupConfig(config);
    } catch (e) {
      console.error('Failed to load backup config:', e);
    }
  };

  const loadBackups = async () => {
    try {
      const list = await window.api.getBackups();
      setBackups(list);
    } catch (e) {
      console.error('Failed to load backups:', e);
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

  const loadTemplates = async () => {
    try {
      const data = await window.api.getTemplates();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  };

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
        localStorage.removeItem('antidetect-settings');
        window.location.reload();
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  // Telegram handlers
  const handleSaveTelegram = async () => {
    try {
      const result = await window.api.updateTelegramConfig(telegramConfig);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        alert(t('settingsSaved'));
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      alert('Please enter bot token and chat ID');
      return;
    }

    setTelegramTesting(true);
    setTelegramTestResult(null);

    try {
      const result = await window.api.testTelegram(telegramConfig.botToken, telegramConfig.chatId);
      setTelegramTestResult({
        success: result.success,
        message: result.success ? t('telegramTestSuccess') : (result.error || t('telegramTestFailed')),
      });
    } catch (e: any) {
      setTelegramTestResult({ success: false, message: e.message });
    } finally {
      setTelegramTesting(false);
    }
  };

  // Backup handlers
  const handleSaveBackupConfig = async () => {
    try {
      const result = await window.api.updateBackupConfig(backupConfig);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        alert(t('settingsSaved'));
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await window.api.createBackup();
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        alert(t('backupCreated'));
        loadBackups();
        loadBackupConfig();
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (path: string) => {
    if (!confirm(t('restoreConfirm'))) return;

    setIsRestoringBackup(true);
    try {
      const result = await window.api.restoreBackup(path);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        alert(t('backupRestored'));
        window.location.reload();
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleDeleteBackup = async (path: string) => {
    if (!confirm(t('deleteBackupConfirm'))) return;

    try {
      const result = await window.api.deleteBackup(path);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        loadBackups();
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    }
  };

  // Group handlers
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const result = await window.api.createGroup({ name: newGroupName.trim(), color: newGroupColor });
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        setNewGroupName('');
        loadGroups();
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      const result = await window.api.updateGroup(editingGroup);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        setEditingGroup(null);
        loadGroups();
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm(t('deleteGroupConfirm'))) return;

    try {
      const result = await window.api.deleteGroup(id);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        loadGroups();
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    }
  };

  // Template handlers
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t('deleteTemplateConfirm'))) return;

    try {
      const result = await window.api.deleteTemplate(id);
      if ('error' in result) {
        alert(`${t('error')}: ${result.error}`);
      } else {
        loadTemplates();
      }
    } catch (e: any) {
      alert(`${t('error')}: ${e.message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return t('never');
    const d = new Date(date);
    return d.toLocaleString();
  };

  const renderGeneralTab = () => (
    <>
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
    </>
  );

  const renderTelegramTab = () => (
    <>
      <div className="settings-section">
        <h2>{t('telegram')}</h2>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('telegramEnabled')}</label>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={telegramConfig.enabled}
              onChange={e => setTelegramConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('botToken')}</label>
          </div>
          <input
            type="text"
            className="input setting-input"
            value={telegramConfig.botToken}
            onChange={e => setTelegramConfig(prev => ({ ...prev, botToken: e.target.value }))}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('chatId')}</label>
          </div>
          <input
            type="text"
            className="input setting-input"
            value={telegramConfig.chatId}
            onChange={e => setTelegramConfig(prev => ({ ...prev, chatId: e.target.value }))}
            placeholder="123456789"
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('notifyOnStart')}</label>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={telegramConfig.notifyOnStart}
              onChange={e => setTelegramConfig(prev => ({ ...prev, notifyOnStart: e.target.checked }))}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('notifyOnComplete')}</label>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={telegramConfig.notifyOnComplete}
              onChange={e => setTelegramConfig(prev => ({ ...prev, notifyOnComplete: e.target.checked }))}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('notifyOnError')}</label>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={telegramConfig.notifyOnError}
              onChange={e => setTelegramConfig(prev => ({ ...prev, notifyOnError: e.target.checked }))}
            />
            <span className="slider"></span>
          </label>
        </div>

        {telegramTestResult && (
          <div className={`test-result ${telegramTestResult.success ? 'success' : 'error'}`}>
            {telegramTestResult.success ? '✓' : '✗'} {telegramTestResult.message}
          </div>
        )}
      </div>

      <div className="settings-actions">
        <button
          className="btn btn-secondary"
          onClick={handleTestTelegram}
          disabled={telegramTesting || !telegramConfig.botToken || !telegramConfig.chatId}
        >
          {telegramTesting ? t('testing') : t('testTelegram')}
        </button>
        <button className="btn btn-primary" onClick={handleSaveTelegram}>
          {t('saveSettings')}
        </button>
      </div>
    </>
  );

  const renderBackupTab = () => (
    <>
      <div className="settings-section">
        <h2>{t('backup')}</h2>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('autoBackup')}</label>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={backupConfig.autoBackup}
              onChange={e => setBackupConfig(prev => ({ ...prev, autoBackup: e.target.checked }))}
            />
            <span className="slider"></span>
          </label>
        </div>

        {backupConfig.autoBackup && (
          <>
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">{t('backupInterval')}</label>
              </div>
              <select
                className="select setting-select"
                value={backupConfig.backupInterval}
                onChange={e => setBackupConfig(prev => ({ ...prev, backupInterval: e.target.value as any }))}
              >
                <option value="daily">{t('backupDaily')}</option>
                <option value="weekly">{t('backupWeekly')}</option>
                <option value="monthly">{t('backupMonthly')}</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">{t('maxBackups')}</label>
              </div>
              <input
                type="number"
                className="input setting-input-small"
                value={backupConfig.maxBackups}
                onChange={e => setBackupConfig(prev => ({ ...prev, maxBackups: Number(e.target.value) }))}
                min={1}
                max={20}
              />
            </div>
          </>
        )}

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('lastBackup')}</label>
          </div>
          <span className="setting-value">{formatDate(backupConfig.lastBackup)}</span>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label className="setting-label">{t('createBackup')}</label>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
          >
            {isCreatingBackup ? t('loading') : t('createBackup')}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>{t('backupList')}</h2>

        {backups.length === 0 ? (
          <p className="no-data">{t('noBackups') || 'No backups available'}</p>
        ) : (
          <div className="backup-list">
            {backups.map((backup, index) => (
              <div key={index} className="backup-item">
                <div className="backup-info">
                  <span className="backup-name">{backup.name}</span>
                  <span className="backup-meta">
                    {formatDate(backup.date)} • {formatFileSize(backup.size)}
                  </span>
                </div>
                <div className="backup-actions">
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => handleRestoreBackup(backup.path)}
                    disabled={isRestoringBackup}
                  >
                    {t('restoreBackup')}
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDeleteBackup(backup.path)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSaveBackupConfig}>
          {t('saveSettings')}
        </button>
      </div>
    </>
  );

  const renderGroupsTab = () => (
    <>
      <div className="settings-section">
        <h2>{t('groups')}</h2>

        <div className="create-group-form">
          <input
            type="text"
            className="input"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder={t('groupName') || 'Group name'}
          />
          <input
            type="color"
            className="color-input"
            value={newGroupColor}
            onChange={e => setNewGroupColor(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
            {t('newGroup')}
          </button>
        </div>

        {groups.length === 0 ? (
          <p className="no-data">{t('noGroups') || 'No groups created'}</p>
        ) : (
          <div className="groups-list">
            {groups.map(group => (
              <div key={group.id} className="group-item">
                {editingGroup?.id === group.id ? (
                  <div className="group-edit">
                    <input
                      type="text"
                      className="input"
                      value={editingGroup.name}
                      onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    />
                    <input
                      type="color"
                      className="color-input"
                      value={editingGroup.color}
                      onChange={e => setEditingGroup({ ...editingGroup, color: e.target.value })}
                    />
                    <button className="btn btn-small btn-primary" onClick={handleUpdateGroup}>
                      {t('saveChanges')}
                    </button>
                    <button className="btn btn-small btn-secondary" onClick={() => setEditingGroup(null)}>
                      {t('cancel')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="group-info">
                      <span className="group-color" style={{ backgroundColor: group.color }}></span>
                      <span className="group-name">{group.name}</span>
                    </div>
                    <div className="group-actions">
                      <button className="btn btn-small btn-secondary" onClick={() => setEditingGroup(group)}>
                        {t('edit')}
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDeleteGroup(group.id)}>
                        {t('delete')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderTemplatesTab = () => (
    <>
      <div className="settings-section">
        <h2>{t('templates')}</h2>
        <p className="section-hint">{t('templatesHint') || 'Templates can be created from the profile modal'}</p>

        {templates.length === 0 ? (
          <p className="no-data">{t('noTemplates') || 'No templates created'}</p>
        ) : (
          <div className="templates-list">
            {templates.map(template => (
              <div key={template.id} className="template-item">
                <div className="template-info">
                  <span className="template-name">{template.name}</span>
                  <span className="template-meta">
                    {template.os} • {template.startHomepage ? template.homepageUrl : 'No homepage'}
                  </span>
                </div>
                <div className="template-actions">
                  <button className="btn btn-small btn-danger" onClick={() => handleDeleteTemplate(template.id)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="settings-page">
      <header className="header">
        <div className="header-left">
          <h1>{t('settingsTitle')}</h1>
        </div>
      </header>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {t('generalSettings')}
        </button>
        <button
          className={`settings-tab ${activeTab === 'telegram' ? 'active' : ''}`}
          onClick={() => setActiveTab('telegram')}
        >
          {t('telegram')}
        </button>
        <button
          className={`settings-tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          {t('backup')}
        </button>
        <button
          className={`settings-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          {t('groups')}
        </button>
        <button
          className={`settings-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          {t('templates')}
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'telegram' && renderTelegramTab()}
        {activeTab === 'backup' && renderBackupTab()}
        {activeTab === 'groups' && renderGroupsTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
      </div>
    </div>
  );
}
