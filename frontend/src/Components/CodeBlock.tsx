import { ReactNode } from 'react';

import { cn } from '@/Lib/Utils';

type CodeBlockProps = {
  children: ReactNode;
  className?: string;
};

export function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-md bg-muted p-6 text-sm text-foreground',
        className,
      )}
    >
      <code className="font-mono whitespace-pre">{children}</code>
    </pre>
  );
}
