import { useEffect, useState } from 'react';

import { getReleaseNotes } from '@/api/app';
import { PageShell } from '@/components/page-shell';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Note,
  Contributor,
  Release,
  ProductDisplay,
} from '@/interfaces/releases';

function getNotesLength(data: Note[], product: ProductDisplay) {
  return product === 'everything'
    ? data.length
    : data.filter((obj) => obj.product === product).length;
}

function ContributorList({
  contributors,
  warning,
}: {
  contributors: Contributor[];
  warning: boolean;
}) {
  if (contributors.length === 0) return null;

  return (
    <span className={warning ? 'text-destructive!' : 'text-muted-foreground!'}>
      {' '}
      by{' '}
      {contributors.map((contributor, index) => (
        <span key={contributor.firstName + contributor.lastName}>
          {index > 0 ? ', ' : ''}
          <a
            className="underline!"
            href={contributor.href ? contributor.href : undefined}
            target="_blank"
            rel="noreferrer"
          >
            {contributor.firstName} {contributor.lastName}
          </a>
        </span>
      ))}
      .
    </span>
  );
}

const ReleaseSection = ({
  title,
  notes,
  product,
}: {
  title: string;
  notes: Note[];
  product: ProductDisplay;
}) => (
  <section className="mt-6 space-y-2">
    <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
    <ul className="list-disc space-y-1 pl-6">
      {notes
        .filter((note) => product === 'everything' || product === note.product)
        .map((note: Note) => {
          const warning = note.warning === true;

          return (
            <li key={note.text} className={warning ? 'text-destructive' : ''}>
              {note.text}
              <ContributorList
                contributors={note.contributors}
                warning={warning}
              />
            </li>
          );
        })}
    </ul>
  </section>
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
    setProduct(value as ProductDisplay);
  };

  useEffect(() => {
    fetchReleaseNotes();
  }, []);

  return (
    <PageShell className="space-y-8 py-0 pb-4">
      <Tabs value={product} onValueChange={onProductChange}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="everything">Everything</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="ms-office">Microsoft Office</TabsTrigger>
          <TabsTrigger value="public-api">Developer API</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-10">
        {releaseNotes.map((release: Release) => {
          const featuresCount = getNotesLength(
            release.categories.features,
            product,
          );
          const improvementsCount = getNotesLength(
            release.categories.improvements,
            product,
          );
          const fixesCount = getNotesLength(release.categories.fixes, product);

          const hasNoNotes =
            featuresCount + improvementsCount + fixesCount === 0;

          if (hasNoNotes) {
            return null;
          }

          return (
            <article
              key={`${release.major}.${release.minor}.${release.patch}`}
              className="space-y-2"
            >
              <h2 className="app-page-heading">
                {release.major}.{release.minor}.{release.patch}
              </h2>
              <p className="text-muted-foreground">{release.description}</p>
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
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
