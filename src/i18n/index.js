import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ur from './locales/ur.json';
import ar from './locales/ar.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
      ar: { translation: ar }
    },
    lng: localStorage.getItem('i18nextLng') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
  const dir = (lng === 'ur' || lng === 'ar') ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

// Initialize DIR
const initialLng = i18n.language;
const initialDir = (initialLng === 'ur' || initialLng === 'ar') ? 'rtl' : 'ltr';
document.documentElement.dir = initialDir;
document.documentElement.lang = initialLng;

export default i18n;
