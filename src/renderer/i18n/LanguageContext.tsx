import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, t, TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('antidetect-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.language === 'ru' || settings.language === 'en') {
          setLanguageState(settings.language);
        }
      }
    } catch (e) {
      console.error('Failed to load language setting:', e);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    // Save to localStorage
    try {
      const saved = localStorage.getItem('antidetect-settings');
      const settings = saved ? JSON.parse(saved) : {};
      settings.language = lang;
      localStorage.setItem('antidetect-settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save language setting:', e);
    }
  };

  const translate = (key: TranslationKey) => t(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
