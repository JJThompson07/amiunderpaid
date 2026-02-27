import modals from './modals.json';
import common from './common.json';
import landing from './landing.json';
import buttons from './buttons.json';
import about from './about.json';
import howItWorks from './how-it-works.json';
import dataSources from './data-sources.json';
import privacyPolicy from './privacy-policy.json';
import sections from './sections.json';
import search from './search.json';

export default defineI18nLocale(async () => {
  return {
    modals,
    common,
    landing,
    buttons,
    about,
    'how-it-works': howItWorks,
    'data-sources': dataSources,
    'privacy-policy': privacyPolicy,
    sections,
    search
  };
});
