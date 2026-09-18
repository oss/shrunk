import { Loader2Icon } from 'lucide-react';

export function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2Icon
        className="size-6 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
