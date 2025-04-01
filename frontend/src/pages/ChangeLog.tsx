import React, { useEffect, useState } from 'react';
import { Col, Flex, Row, Tabs, Typography } from 'antd/lib';
import { getReleaseNotes } from '../api/app';
import {
  Note,
  Contributor,
  Release,
  Product,
  ProductDisplay,
} from '../interfaces/releases';

const ReleaseSection = ({
  title,
  notes,
  product,
}: {
  title: string;
  notes: Note[];
  product: ProductDisplay;
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

          if (product !== note.product && product !== 'everything') {
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
  const [product, setProduct] = useState<ProductDisplay>('everything');
  async function fetchReleaseNotes() {
    const result: Release[] = await getReleaseNotes();

    const normalizedReleases = result.map((release) => ({
      ...release,
      categories: {
        features: release.categories.features.map((note) => ({
          ...note,
          product: note.product ?? 'website',
        })),
        improvements: release.categories.improvements.map((note) => ({
          ...note,
          product: note.product ?? 'website',
        })),
        fixes: release.categories.fixes.map((note) => ({
          ...note,
          product: note.product ?? 'website',
        })),
      },
    }));

    setReleaseNotes(normalizedReleases);
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
          defaultActiveKey={product}
          items={[
            {
              key: 'everything',
              label: 'Everything',
            },
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
        {releaseNotes.map((release: Release, releaseIndex: number) => {
          function getLength(data: Note[]) {
            return product === 'everything'
              ? data.length
              : data.filter((obj) => obj.product === product).length;
          }

          const featuresCount = getLength(release.categories.features);
          const improvementsCount = getLength(release.categories.improvements);
          const fixesCount = getLength(release.categories.fixes);

          if (featuresCount + improvementsCount + fixesCount === 0) {
            return <></>;
          }

          return (
            <Col span={24}>
              <Typography.Title className={releaseIndex === 0 ? 'tw-mt-2' : ''}>
                {release.major}.{release.minor}.{release.patch}
              </Typography.Title>
              <Typography.Text>{release.description}</Typography.Text>
              {featuresCount !== 0 && (
                <ReleaseSection
                  title="New Features"
                  notes={release.categories.features}
                  product={product}
                />
              )}
              {improvementsCount !== 0 && (
                <ReleaseSection
                  title="Improvements"
                  notes={release.categories.improvements}
                  product={product}
                />
              )}
              {fixesCount !== 0 && (
                <ReleaseSection
                  title="Bug Fixes"
                  notes={release.categories.fixes}
                  product={product}
                />
              )}
            </Col>
          );
        })}
      </Row>
    </>
  );
}
