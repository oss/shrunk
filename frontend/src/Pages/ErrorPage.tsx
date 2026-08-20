import { PageShell } from '@/Components/PageShell';
import { Button } from '@/Components/ui/button';

interface IErrorPage {
  title: string;
  description: string;
  onRetry?: () => void;
}

export default function ErrorPage(props: IErrorPage) {
  return (
    <PageShell className="flex min-h-[45vh] max-w-3xl flex-col items-center justify-center text-center">
      <h1 className="m-0 text-7xl font-bold tracking-tighter text-balance">
        {props.title}
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">
        {props.description}
      </p>
      {props.onRetry && (
        <Button className="mt-6" variant="outline" onClick={props.onRetry}>
          Try again
        </Button>
      )}
    </PageShell>
  );
}
