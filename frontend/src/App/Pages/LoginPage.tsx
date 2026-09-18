import { LogInIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { PageShell } from '@/Shared/ui/page-shell';
import { SectionCard } from '@/App/Pages/SectionCard';
import { Button } from '@/Shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Shared/ui/select';
import { useFeatureFlags } from '@/App/FeatureFlagsContext';
import { FeatureFlags } from '@/App/Types';
import { devLogin } from '@/App/Api';
import { useSession } from '@/App/useSession';

type LoginLink =
  | 'guest'
  | 'user'
  | 'facstaff'
  | 'powerUser'
  | 'admin'
  | 'default';

interface LoginType {
  loginMessage: string;
  devKind?: 'guest' | 'user' | 'facstaff' | 'power' | 'admin';
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
  const { refreshSession } = useSession();
  const navigate = useNavigate();

  const [loginLink, setLoginLink] = useState<LoginLink>(() =>
    new URLSearchParams(window.location.search).get('pa11y') ===
    'smoke-login-admin'
      ? 'admin'
      : 'default',
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loginTypes: Record<LoginLink, LoginType> = {
    user: {
      loginMessage: 'DEV_USER',
      devKind: 'user',
    },
    guest: {
      loginMessage: 'DEV_GUEST',
      devKind: 'guest',
    },
    facstaff: {
      loginMessage: 'DEV_FACSTAFF',
      devKind: 'facstaff',
    },
    powerUser: {
      loginMessage: 'DEV_POWER',
      devKind: 'power',
    },
    admin: {
      loginMessage: 'DEV_ADMIN',
      devKind: 'admin',
    },
    default: { loginMessage: 'PROD_SAML' },
  };

  return (
    <PageShell className="space-y-10">
      <section className="text-center">
        <div className="mx-auto max-w-5xl">
          <h1 className="m-0 text-4xl font-bold tracking-tighter text-balance sm:text-5xl md:text-6xl lg:text-7xl">
            Shorten Links for the Rutgers Community
          </h1>
        </div>
      </section>

      <div>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {featureFlags.devLogins && (
            <Select
              value={loginLink}
              onValueChange={(value) => setLoginLink(value as LoginLink)}
            >
              <SelectTrigger aria-label="Login type" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(loginTypes).map(([key, value]) => (
                  <SelectItem
                    key={key}
                    value={key}
                    id={`pa11y-login-${value.loginMessage}`}
                    data-pa11y-login={value.loginMessage}
                  >
                    {value.loginMessage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            id="pa11y-login-submit"
            size="lg"
            disabled={isLoggingIn}
            onClick={async () => {
              const { devKind } = loginTypes[loginLink];
              if (!devKind) {
                // Intentional: CAS authentication leaves the SPA.
                window.location.href = '/login';
                return;
              }

              setIsLoggingIn(true);
              try {
                await devLogin(devKind);
                await refreshSession();
                navigate('/app/dash');
              } catch {
                toast.error('Unable to log in.');
              } finally {
                setIsLoggingIn(false);
              }
            }}
          >
            <LogInIcon />
            {isLoggingIn
              ? 'Logging in…'
              : featureFlags.devLogins
                ? 'Developer Login'
                : 'Login with CAS'}
          </Button>
        </div>
      </div>

      <div>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <SectionCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </section>
      </div>
    </PageShell>
  );
}
