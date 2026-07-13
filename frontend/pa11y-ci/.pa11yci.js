const url = `http://${process.env.PA11Y_URL}/app`;
// --no-sandbox is needed for running pa11y in docker/podman
const args = ['--no-sandbox'];
if (process.env.PA11Y_THEME === 'dark') {
  args.push('--force-dark-mode');
}
module.exports = {
  defaults: {
    // Preserve cookies, so our logins work
    useIncognitoBrowserContext: false,
    chromeLaunchConfig: {
      args: args,
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
    runners: ['htmlcs', 'axe'],
  },
  urls: [
    `${url}`,
    {
      url: `${url}/login`,
      actions: [
        `wait for element button[aria-expanded=false] to be visible`,
        `click element button[aria-expanded=false]`,
        `wait for element div[role='option'] to be visible`,
        `click element div[role='option']:nth-child(4) `, // selects POWER_USER login
        `wait for element div[role='option'] to be hidden`,
        `click element button`,
        `click button.inline-flex:nth-child(2)`, // Developer Login button
      ],
    },
    `${url}/dash`,
    `${url}/orgs`,
    `${url}/api-reference`,
    `${url}/releases`,
    `${url}/faq`,
    `${url}/links/6651000000000000000001e0`,
  ],
};
