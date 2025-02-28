import React, { useEffect, useState } from 'react';
import { Col, Row, Typography } from 'antd/lib';

enum ReleaseCategory {
  IMPROVEMENTS = 'improvements',
  FEATURES = 'features',
  FIXES = 'fixes',
}

interface Contributor {
  firstName: string;
  lastName: string;
  href?: string;
}

interface Note {
  text: string;
  contributors: Contributor[];
  internal?: boolean;
  warning?: boolean;
}

interface Release {
  major: number;
  minor: number;
  patch: number;
  description: string;
  categories: {
    [ReleaseCategory.FEATURES]: Note[];
    [ReleaseCategory.IMPROVEMENTS]: Note[];
    [ReleaseCategory.FIXES]: Note[];
  };
}

const ReleaseSection = ({ title, notes }: { title: string; notes: Note[] }) => (
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

  async function fetchReleaseNotes() {
    const resp = await fetch(`/api/v1/release-notes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await resp.json();
    setReleaseNotes(result as Release[]);
  }

  useEffect(() => {
    fetchReleaseNotes();
  }, []);

  return (
    <>
      <Row gutter={[16, 16]}>
        {releaseNotes.map((release: Release) => (
          <Col span={24}>
            <Typography.Title>
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
