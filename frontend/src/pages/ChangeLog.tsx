import React, { useEffect, useState } from 'react';
import { Col, Flex, Row, Tabs, Typography } from 'antd/lib';
import { getReleaseNotes } from '../api/app';
import { Note, Contributor, Release, Product } from '../interfaces/releases';

const ReleaseSection = ({
  title,
  notes,
  product,
}: {
  title: string;
  notes: Note[];
  product: Product;
}) => (
  <>
    <Typography.Title level={2} className="!tw-mt-4">
      {title}
    </Typography.Title>
    <Typography.Paragraph>
      <ul>
        {notes.map((note: Note) => {
          const primaryColor = note.warning ? 'tw-text-red-600' : '';
          const secondaryColor = note.warning
            ? '!tw-text-red-500'
            : '!tw-text-gray-500';

          if (product !== note.product && note.product) {
            return <></>;
          }

          /*
           * The last period after span is NOT a mistake, it is to
           * support Apple's VoiceOver for reading text outloud.
           */

          return (
            <li key={note.text} className={primaryColor}>
              {note.text}{' '}
              {note.contributors.length !== 0 && (
                <span className={secondaryColor}>
                  by{' '}
                  {note.contributors
                    .map((contributor: Contributor) => (
                      <Typography.Link
                        className={`${secondaryColor} !tw-underline`}
                        href={contributor.href ? contributor.href : undefined}
                        target="_blank"
                      >
                        {contributor.firstName} {contributor.lastName}
                      </Typography.Link>
                    ))
                    .reduce((prev, curr) => [prev, ', ', curr] as any)}
                  .
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Typography.Paragraph>
  </>
);

export default function ChangeLog() {
  const [releaseNotes, setReleaseNotes] = useState<Release[]>([]);
  const [product, setProduct] = useState<Product>('website');

  async function fetchReleaseNotes() {
    const result = await getReleaseNotes();
    setReleaseNotes(result as Release[]);
  }

  const onProductChange = (value: string) => {
    setProduct(value as Product);
  };

  useEffect(() => {
    fetchReleaseNotes();
  }, []);

  return (
    <>
      <Flex justify="left" className="tw-pt-4">
        <Tabs
          onChange={onProductChange}
          defaultActiveKey="1"
          items={[
            {
              key: 'website',
              label: 'Website',
            },
            {
              key: 'ms-office',
              label: 'Microsoft Office',
            },
            {
              key: 'public-api',
              label: 'Developer API',
            },
          ]}
        />
      </Flex>
      <Row gutter={[16, 16]}>
        {releaseNotes.map((release: Release, releaseIndex: number) => (
          <Col span={24}>
            <Typography.Title className={releaseIndex === 0 ? 'tw-mt-2' : ''}>
              {release.major}.{release.minor}.{release.patch}
            </Typography.Title>
            <Typography.Text>{release.description}</Typography.Text>
            {release.categories.features.length !== 0 && (
              <ReleaseSection
                title="New Features"
                notes={release.categories.features}
              />
            )}
            {release.categories.improvements.length !== 0 && (
              <ReleaseSection
                title="Improvements"
                notes={release.categories.improvements}
              />
            )}
            {release.categories.fixes.length !== 0 && (
              <ReleaseSection
                title="Bug Fixes"
                notes={release.categories.fixes}
              />
            )}
          </Col>
        ))}
      </Row>
    </>
  );
}
