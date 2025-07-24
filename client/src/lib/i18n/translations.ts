import { commonTranslations } from './modules/common';
import { navigationTranslations } from './modules/navigation';
import { reportsTranslations } from './modules/reports';
import { settingsTranslations } from './modules/settings';
import { notFoundTranslations } from './modules/notFound';
import type { LanguageTranslations } from './types';

export const translations: LanguageTranslations = {
  ko: {
    common: commonTranslations.ko,
    nav: navigationTranslations.ko,
    reports: reportsTranslations.ko,
    settings: settingsTranslations.ko,
    notFound: notFoundTranslations.ko,
  },
  en: {
    common: commonTranslations.en,
    nav: navigationTranslations.en,
    reports: reportsTranslations.en,
    settings: settingsTranslations.en,
    notFound: notFoundTranslations.en,
  },
  vi: {
    common: commonTranslations.vi,
    nav: navigationTranslations.vi,
    reports: reportsTranslations.vi,
    settings: settingsTranslations.vi,
    notFound: notFoundTranslations.vi,
  },
};