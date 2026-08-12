const rootUrl = `http://${process.env.PA11Y_URL}/app`;

const linkId = '6651000000000000000001e0';
const organizationId = '665000000000000000000001';
const ticketId = '665200000000000000000001';

const scenarioUrl = (path, name) => {
  const separator = path.includes('?') ? '&' : '?';
  return `${rootUrl}${path}${separator}pa11y=${name}`;
};

const waitFor = (selector) => `wait for element ${selector} to be visible`;
const openSelectOption = (id) =>
  `div[role='listbox'][data-state='open'] #${id}`;

const loginActions = (loginType) => [
  waitFor("button[aria-label='Login type']"),
  "click element button[aria-label='Login type']",
  waitFor("button[aria-label='Login type'][aria-expanded='true']"),
  waitFor(openSelectOption(`pa11y-login-${loginType}`)),
  `click element ${openSelectOption(`pa11y-login-${loginType}`)}`,
  waitFor("button[aria-label='Login type'][aria-expanded='false']"),
  'click element #pa11y-login-submit',
  waitFor("header button[aria-label='Open account menu']"),
];

const openDashboardSearch = [
  waitFor("button[aria-label='Search links']"),
  'click element #dashboard-filter-trigger',
  waitFor("input[placeholder='Title']"),
];

const smokeUrls = [
  {
    url: scenarioUrl('/login', 'smoke-login-admin'),
    actions: loginActions('DEV_ADMIN'),
  },
  scenarioUrl('/dash', 'smoke-dashboard'),
  {
    url: scenarioUrl('/dash', 'smoke-dashboard-search'),
    actions: openDashboardSearch,
  },
  scenarioUrl('/links/' + linkId, 'smoke-link-detail'),
  {
    url: scenarioUrl('/orgs/' + organizationId, 'smoke-organization'),
    actions: [waitFor('table tbody tr:nth-child(7) td')],
  },
  {
    url: scenarioUrl('/tickets/' + ticketId, 'smoke-ticket-detail'),
    actions: [waitFor('h1.app-page-heading')],
  },
  scenarioUrl('/admin', 'smoke-admin-dashboard'),
];

module.exports = {
  defaults: {
    // Keep one deterministic admin session per theme job.
    useIncognitoBrowserContext: false,
    concurrency: 1,
    wait: 250,
    viewport: { width: 1280, height: 1200 },
    chromeLaunchConfig: {
      defaultViewport: { width: 1280, height: 1200 },
      args: [
        '--no-sandbox',
        '--force-prefers-reduced-motion',
        process.env.PA11Y_THEME === 'dark'
          ? '--force-dark-mode'
          : '--force-light-mode',
      ],
    },
    reporters: [
      'cli',
      [
        'json',
        {
          fileName: `./workspace/accessibility-${process.env.PA11Y_THEME}.json`,
        },
      ],
    ],
    runners: ['axe'],
  },
  urls: smokeUrls,
};
