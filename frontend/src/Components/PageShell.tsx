import { ReactNode } from 'react';

import { cn } from '@/Lib/Utils';

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main
      className={cn('mx-auto w-full max-w-7xl px-4 py-10 sm:px-6', className)}
    >
      {children}
    </main>
  );
}
