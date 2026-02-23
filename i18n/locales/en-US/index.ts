import common from './common.json';
import landing from './landing.json';
import buttons from './buttons.json';
import about from './about.json';
import howItWorks from './how-it-works.json';
import dataSources from './data-sources.json';
// import privacyPolicy from './privacy-policy.json';

export default defineI18nLocale(async () => {
  return {
    landing,
    common,
    buttons,
    about,
    'how-it-works': howItWorks,
    'data-sources': dataSources
  };
});
