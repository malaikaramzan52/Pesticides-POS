import en from './locales/en.js';

export const locales = {
  en
};

export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' }
];

export function registerLanguage(code, translationObj) {
  locales[code] = translationObj;
}
