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
import navbar from './navbar.json';
import meta from './meta.json';
import card from './card.json';
import email from './email.json';
import faq from './faq.json';
import login from './login.json';
import recruiter from './recruiter.json';
import mca from './mca.json';
import account from './account.json';
import toast from './toast.json';

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
    search,
    navbar,
    meta,
    card,
    email,
    faq,
    login,
    recruiter,
    mca,
    account,
    toast
  };
});
