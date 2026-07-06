import { PageShell } from '@/components/page-shell';

interface IErrorPage {
  title: string;
  description: string;
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
    </PageShell>
  );
}
