import { useEffect, useState } from 'react';

import { getReleaseNotes } from '@/Api/App';
import { getErrorMessage } from '@/Api/Client';
import { PageShell } from '@/Components/PageShell';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import {
  Note,
  Contributor,
  Release,
  ProductDisplay,
} from '@/Interfaces/Releases';

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
      {contributors.map((contributor, Index) => (
        <span key={contributor.firstName + contributor.lastName}>
          {Index > 0 ? ', ' : ''}
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const onProductChange = (value: string) => {
    setProduct(value as ProductDisplay);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchReleaseNotes = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      try {
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

        if (!cancelled) {
          setReleaseNotes(normalizedReleases);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, 'Unable to load release notes.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchReleaseNotes();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <PageShell className="space-y-8 py-0 pb-4">
      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load release notes</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading release notes...</p>
      ) : (
        <>
          <div
            role="group"
            aria-label="Filter releases by product"
            className="flex h-auto flex-wrap justify-start gap-1 rounded-lg bg-muted p-1"
          >
            {(
              [
                ['everything', 'Everything'],
                ['website', 'Website'],
                ['ms-office', 'Microsoft Office'],
                ['public-api', 'Developer API'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={product === value}
                className="rounded-md px-3 py-1 text-sm font-medium text-foreground data-[active=true]:bg-background data-[active=true]:shadow"
                data-active={product === value}
                onClick={() => onProductChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
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
              const fixesCount = getNotesLength(
                release.categories.fixes,
                product,
              );

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
        </>
      )}
    </PageShell>
  );
}
