import { Button, Card, Col, Flex, Row, Select, Space } from 'antd';
import { LogInIcon } from 'lucide-react';
import React, { useState } from 'react';
import { useFeatureFlags } from '../contexts/FeatureFlags';
import { FeatureFlags } from '../interfaces/app';
import BlurFade from '../components/magicui/blur-fade';

interface LoginType {
  loginMessage: string;
  href: string;
}

export default function Login() {
  const featureFlags: FeatureFlags = useFeatureFlags();

  const [loginLink, setLoginLink] = useState<
    'guest' | 'user' | 'facstaff' | 'powerUser' | 'admin' | 'default'
  >('default');

  const loginTypes: { [key: string]: LoginType } = {
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
    <>
      <Row gutter={[16, 16]}>
        <Col span={24} className="tw-mb-2 tw-mt-12 tw-text-center">
          <Flex justify="center">
            <BlurFade delay={0.25} inView className="tw-size-2/3">
              <h1
                className="tw-m-0 tw-text-balance tw-text-4xl tw-font-bold
               tw-tracking-tighter sm:tw-text-5xl md:tw-text-6xl lg:tw-text-7xl"
              >
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
                icon={<LogInIcon />}
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
            <Row gutter={[16, 16]}>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Shorten Links"
                    description="Shorten links to make them easier to share under the rutgers.edu domain."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Create Tracking Pixels"
                    description="Are people reading your emails? You can create tracking pixels to see if people are opening your emails."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Generate QR Codes"
                    description="From creating a shortened link, you can generate a QR code for it for posters, flyers, or other media."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Built-in Analytics"
                    description="See how many times your link has been clicked, where it was clicked, and what browser was used."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Manage within an Organization"
                    description="Links shared within an organization can be instantly shared with other members of the organization."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Google Safe Browsing"
                    description="We use Google Safe Browsing to check for malicious links to protect the Rutgers community from accidental phishing attacks."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Add expiration dates to links"
                    description="You can add expiration dates to links so that they are only valid for a certain amount of time."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Microsoft 365 Integration"
                    description="We are working on integrating with Microsoft 365 to allow for easy link shortening and tracking pixel creation from Outlook."
                  />
                </Card>
              </Col>
              <Col span={8} xs={24} sm={12} md={8}>
                <Card className="tw-h-full tw-w-full">
                  <Card.Meta
                    title="Free and Open Source"
                    description="This entire service is free and open source on GitHub! No ads or subscription fees here."
                  />
                </Card>
              </Col>
            </Row>
          </BlurFade>
        </Col>
      </Row>
    </>
  );
}
