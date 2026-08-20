import React from 'react';
import { Button } from '@/Components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/** Prevent an unexpected render failure from leaving the application blank. */
export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <section className="max-w-lg space-y-4 text-center" role="alert">
            <h1 className="text-3xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              Shrunk could not display this page. Please reload and try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Shrunk
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
