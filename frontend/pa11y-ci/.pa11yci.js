const rootUrl = `http://${process.env.PA11Y_URL}/app`;

const linkId = '6651000000000000000001e0';
const organizationId = '665000000000000000000001';
const rawNeedsReview = process.env.PA11Y_RAW === '1';

const scenarioUrl = (path, name) => {
  const separator = path.includes('?') ? '&' : '?';
  return `${rootUrl}${path}${separator}pa11y=${name}`;
};

const waitFor = (selector) => `wait for element ${selector} to be visible`;
const loginActions = [
  waitFor('#pa11y-login-submit'),
  'click element #pa11y-login-submit',
  waitFor("header button[aria-label='Open account menu']"),
];

const openDashboardSearch = [
  waitFor("button[aria-label='Open link filters']"),
  "click element button[aria-label='Open link filters']",
  waitFor("input[placeholder='Title']"),
];

const smokeUrls = [
  {
    url: scenarioUrl('/login', 'smoke-login-admin'),
    actions: loginActions,
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
          fileName: `./workspace/accessibility${rawNeedsReview ? '-needs-review' : ''}-${process.env.PA11Y_THEME}.json`,
        },
      ],
    ],
    runners: ['axe'],
    // axe-core can't always determine a check's outcome with certainty (e.g.
    // whether a portal-rendered aria-controls target counts as "within" its
    // popup, or whether inline links interleaved with text create an
    // ambiguous background sample) and reports those as "incomplete" rather
    // than a real pass/fail. pa11y otherwise treats "incomplete" the same as
    // a confirmed violation; cap it below error so only confirmed violations
    // fail the build. The nonblocking PA11Y_RAW job preserves the uncapped
    // incomplete results for review.
    ...(rawNeedsReview ? {} : { levelCapWhenNeedsReview: 'notice' }),
  },
  urls: smokeUrls,
};
