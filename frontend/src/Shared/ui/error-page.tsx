import { PageShell } from '@/Shared/ui/page-shell';
import { Button } from '@/Shared/ui/button';

interface IErrorPage {
  title: string;
  description: string;
  onRetry?: () => void;
}

export default function ErrorPage({ title, description, onRetry }: IErrorPage) {
  return (
    <PageShell className="flex min-h-[45vh] max-w-3xl flex-col items-center justify-center text-center">
      <h1 className="m-0 text-7xl font-bold tracking-tighter text-balance">
        {title}
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </PageShell>
  );
}
