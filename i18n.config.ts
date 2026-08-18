export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en-GB',
  fallbackLocale: {
    en: ['en-GB', 'en-US'],
    default: ['en-GB']
  },
  fallbackWarn: false,
  missingWarn: false
}));
