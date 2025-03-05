import { LoginOutlined } from '@ant-design/icons';
import { Button, Col, Row, Flex, Card, Select, Space } from 'antd/lib';
import React, { useState } from 'react';
import BlurFade from '../ext/components/ui/blur-fade';
import Dashboard from './Dashboard';
import { BorderBeam } from '../ext/components/ui/border-beam';
import { FeatureFlags, useFeatureFlags } from '../contexts/FeatureFlags';

interface LoginType {
  loginMessage: string;
  href: string;
}

export default function Login() {
  const featureFlags: FeatureFlags = useFeatureFlags();

  const [loginLink, setLoginLink] = useState<
    'user' | 'facstaff' | 'powerUser' | 'admin' | 'default'
  >('default');

  const loginTypes: { [key: string]: LoginType } = {
    user: { href: '/api/v1/devlogins/user', loginMessage: 'DEV_USER' },
    facstaff: {
      href: '/api/v1/devlogins/facstaff',
      loginMessage: 'DEV_FACSTAFF',
    },
    powerUser: {
      href: '/api/v1/devlogins/power',
      loginMessage: 'DEV_POWER',
    },
    admin: { href: '/api/v1/devlogins/admin', loginMessage: 'DEV_ADMIN' },
    default: { href: '/login', loginMessage: 'PROD_SAML' },
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24} className="tw-mb-2 tw-mt-12 tw-text-center">
          <Flex justify="center">
            <BlurFade delay={0.25} inView className="tw-size-2/3">
              <h1 className="tw-m-0 tw-text-balance tw-text-7xl tw-font-bold tw-tracking-tighter">
                Shorten Links for the Rutgers Community
              </h1>
            </BlurFade>
          </Flex>
        </Col>
        <Col span={24} className="tw-mb-6 tw-text-center">
          <BlurFade delay={0.25 * 1.5} inView>
            <Space>
              {featureFlags.devLogins && (
                <Select
                  defaultValue={loginLink}
                  size="large"
                  className="tw-w-36"
                  onChange={(value: any) => {
                    setLoginLink(value);
                  }}
                  options={Object.entries(loginTypes).map(([key, value]) => ({
                    value: key,
                    label: value.loginMessage,
                  }))}
                />
              )}
              <Button
                icon={<LoginOutlined />}
                size="large"
                type="primary"
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
                {featureFlags.devLogins ? 'Developer Login' : 'Login with CAS'}
              </Button>
            </Space>
          </BlurFade>
        </Col>
        <Col span={24}>
          <BlurFade delay={0.25 * 2} inView>
            <Card className="tw-pointer-events-none tw-relative tw-select-none">
              <Dashboard
                demo
                mockData={[
                  {
                    title: 'Sojourner Truth Apartments in New Brunswick',
                    long_url:
                      'https://ruoncampus.rutgers.edu/living-on-campus/college-ave/sojourner-truth-apartments',
                    created_time: new Date('2004-07-22T03:24:00'),
                    visits: 21425152,
                    unique_visits: 346983,
                    owner: 'FAKE_NETID1',
                    aliases: [
                      {
                        alias: 'soujourner',
                        description: '',
                        deleted: false,
                      },
                    ],
                    id: '',
                    domain: '',
                    is_expired: false,
                    expiration_time: null,
                    deletion_info: null,
                    may_edit: false,
                    is_tracking_pixel_link: false,
                    editors: [],
                    viewers: [],
                  },
                  {
                    title: 'Careers at Rutgers Newark',
                    long_url:
                      'https://studentaffairs.newark.rutgers.edu/career-resources-exploration',
                    created_time: new Date('2014-02-27T03:24:00'),
                    visits: 5453452,
                    unique_visits: 23152,
                    owner: 'FAKE_NETID3',
                    aliases: [
                      {
                        alias: 'newark-careers',
                        description: '',
                        deleted: false,
                      },
                    ],
                    id: '',
                    domain: '',
                    is_expired: false,
                    expiration_time: null,
                    deletion_info: null,
                    may_edit: false,
                    is_tracking_pixel_link: false,
                    editors: [],
                    viewers: [],
                  },
                  {
                    title: 'Rutgers Camden & Camden County College Partnership',
                    long_url:
                      'https://www.camdencc.edu/admissions-financial-aid/transfer-services/rutgers-camden-county-college/',
                    created_time: new Date('2024-12-17T03:24:00'),
                    visits: 125343142,
                    unique_visits: 5634,
                    owner: 'FAKE_NETID2',
                    aliases: [
                      {
                        alias: 'camden',
                        description: '',
                        deleted: false,
                      },
                    ],
                    id: '',
                    domain: '',
                    is_expired: false,
                    expiration_time: null,
                    deletion_info: null,
                    may_edit: false,
                    is_tracking_pixel_link: false,
                    editors: [],
                    viewers: [],
                  },
                  {
                    title:
                      'Rutgers University Open System Solutions creating Open Source Software',
                    long_url:
                      'https://www.rutgers.edu/news/rutgers-start-ups-student-developers-gain-skills-building-real-world-apps',
                    created_time: new Date('2012-02-16T03:24:00'),
                    visits: 3451242,
                    unique_visits: 4123,
                    owner: 'FAKE_NETID1',
                    aliases: [
                      {
                        alias: 'open-source',
                        description: '',
                        deleted: false,
                      },
                    ],
                    id: '',
                    domain: '',
                    is_expired: false,
                    expiration_time: null,
                    deletion_info: null,
                    may_edit: false,
                    is_tracking_pixel_link: false,
                    editors: [],
                    viewers: [],
                  },
                  {
                    title: 'Rutgers OIT Support',
                    long_url: 'https://it.rutgers.edu/departmental-support/',
                    created_time: new Date('2015-01-23T03:24:00'),
                    visits: 325098,
                    unique_visits: 1253,
                    owner: 'FAKE_NETID1',
                    aliases: [
                      {
                        alias: 'oit-support',
                        description: '',
                        deleted: false,
                      },
                    ],
                    id: '',
                    domain: '',
                    is_expired: false,
                    expiration_time: null,
                    deletion_info: null,
                    may_edit: false,
                    is_tracking_pixel_link: false,
                    editors: [],
                    viewers: [],
                  },
                ]}
                userPrivileges={new Set<string>()}
                netid=""
              />

              <BorderBeam duration={12} delay={9} />
            </Card>
          </BlurFade>
        </Col>
      </Row>
    </>
  );
}
