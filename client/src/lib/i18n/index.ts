import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, TranslationKey, Translations } from './types';
import { translations } from './translations';

interface LanguageStore {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      currentLanguage: 'ko',
      setLanguage: (language: Language) => set({ currentLanguage: language }),
    }),
    {
      name: 'pos-language',
    }
  )
);

function getNestedTranslation(obj: any, key: string): string | undefined {
  const keys = key.split('.');
  let value = obj;

  for (const k of keys) {
    value = value?.[k];
  }

  return value;
}

export function useTranslation() {
  const { currentLanguage } = useLanguageStore();

  const t = (key: TranslationKey): string => {
    const value = getNestedTranslation(translations[currentLanguage], key);

    // Development-time validation
    if (!value && import.meta.env.DEV) {
      console.warn(`Missing translation key: ${key} in language: ${currentLanguage}`);
    }

    return value || key;
  };

  return { t, currentLanguage };
}

// Re-export types for convenience
export type { Language, TranslationKey };