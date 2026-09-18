import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '@/App/useSession';
import { RouteFallback } from '@/Shared/ui/route-fallback';

export function ProtectedRoute({
  requires,
  children,
}: PropsWithChildren<{ requires: string }>) {
  const { privileges, isLoading } = useSession();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!privileges.has(requires)) {
    return <Navigate to="/app/dash" replace />;
  }

  return <>{children}</>;
}
