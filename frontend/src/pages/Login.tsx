import { LogInIcon } from 'lucide-react';
import { useState } from 'react';

import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFeatureFlags } from '@/contexts/FeatureFlags';
import { FeatureFlags } from '@/interfaces/app';
import BlurFade from '@/components/magicui/blur-fade';

type LoginLink =
  | 'guest'
  | 'user'
  | 'facstaff'
  | 'powerUser'
  | 'admin'
  | 'default';

interface LoginType {
  loginMessage: string;
  href: string;
}

const featureCards = [
  {
    title: 'Shorten Links',
    description:
      'Shorten links to make them easier to share under the rutgers.edu domain.',
  },
  {
    title: 'Create Tracking Pixels',
    description:
      'Are people reading your emails? You can create tracking pixels to see if people are opening your emails.',
  },
  {
    title: 'Generate QR Codes',
    description:
      'From creating a shortened link, you can generate a QR code for it for posters, flyers, or other media.',
  },
  {
    title: 'Built-in Analytics',
    description:
      'See how many times your link has been clicked, where it was clicked, and what browser was used.',
  },
  {
    title: 'Manage within an Organization',
    description:
      'Links shared within an organization can be instantly shared with other members of the organization.',
  },
  {
    title: 'Google Safe Browsing',
    description:
      'We use Google Safe Browsing to check for malicious links to protect the Rutgers community from accidental phishing attacks.',
  },
  {
    title: 'Add expiration dates to links',
    description:
      'You can add expiration dates to links so that they are only valid for a certain amount of time.',
  },
  {
    title: 'Microsoft 365 Integration',
    description:
      'We are working on integrating with Microsoft 365 to allow for easy link shortening and tracking pixel creation from Outlook.',
  },
  {
    title: 'Free and Open Source',
    description:
      'This entire service is free and open source on GitHub! No ads or subscription fees here.',
  },
];

export default function Login() {
  const featureFlags: FeatureFlags = useFeatureFlags();

  const [loginLink, setLoginLink] = useState<LoginLink>('default');

  const loginTypes: Record<LoginLink, LoginType> = {
    user: { href: '/api/core/devlogins/user', loginMessage: 'DEV_USER' },
    guest: { href: '/api/core/devlogins/guest', loginMessage: 'DEV_GUEST' },
    facstaff: {
      href: '/api/core/devlogins/facstaff',
      loginMessage: 'DEV_FACSTAFF',
    },
    powerUser: {
      href: '/api/core/devlogins/power',
      loginMessage: 'DEV_POWER',
    },
    admin: { href: '/api/core/devlogins/admin', loginMessage: 'DEV_ADMIN' },
    default: { href: '/login', loginMessage: 'PROD_SAML' },
  };

  return (
    <PageShell className="space-y-10">
      <section className="text-center">
        <BlurFade delay={0.25} inView className="mx-auto max-w-5xl">
          <h1 className="m-0 text-4xl font-bold tracking-tighter text-balance sm:text-5xl md:text-6xl lg:text-7xl">
            Shorten Links for the Rutgers Community
          </h1>
        </BlurFade>
      </section>

      <BlurFade delay={0.25 * 1.5} inView>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {featureFlags.devLogins && (
            <Select
              value={loginLink}
              onValueChange={(value) => setLoginLink(value as LoginLink)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(loginTypes).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.loginMessage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="lg"
            onClick={async () => {
              if (loginTypes[loginLink].loginMessage === 'PROD_SAML') {
                window.location.href = loginTypes[loginLink].href;
              }

              // eslint-disable-next-line no-restricted-globals
              await fetch(loginTypes[loginLink].href, {
                method: 'POST',
              }).then(() => {
                window.location.pathname = '/app/dash';
              });
            }}
          >
            <LogInIcon />
            {featureFlags.devLogins ? 'Developer Login' : 'Login with CAS'}
          </Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.25 * 2} inView>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <SectionCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </section>
      </BlurFade>
    </PageShell>
  );
}
