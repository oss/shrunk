import { lazy, Suspense } from 'react';
import {
  Navigate,
  Route,
  Routes as RouterRoutes,
  useLocation,
} from 'react-router';
import Login from '@/App/Pages/LoginPage';
import Dashboard from '@/Features/Links/Dashboard';
import { useSession } from '@/App/useSession';
import { ProtectedRoute } from '@/App/ProtectedRoute';
import { RouteFallback } from '@/Shared/ui/route-fallback';

const Stats = lazy(() =>
  import('@/Features/Links/Stats').then((m) => ({ default: m.Stats })),
);
const MyOrganizations = lazy(
  () => import('@/Features/Organizations/OrganizationsPage'),
);
const ManageOrg = lazy(
  () => import('@/Features/Organizations/OrganizationManagePage'),
);
const OrganizationToken = lazy(
  () => import('@/Features/Organizations/OrganizationTokensPage'),
);
const Faq = lazy(() => import('@/App/Pages/FaqPage'));
const ChangeLog = lazy(() => import('@/Features/Changelog/ChangeLogPage'));
const Admin = lazy(() => import('@/Features/Admin/AdminPage'));
const ApiReference = lazy(
  () => import('@/Features/ApiReference/ApiReferencePage'),
);
const ErrorPage = lazy(() => import('@/Shared/ui/error-page'));

export function Routes() {
  const { netid, isLoading } = useSession();
  const { pathname } = useLocation();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (pathname === '/') {
    return <Navigate to="/app/dash" replace />;
  }

  if (
    netid === '' &&
    pathname !== '/app/login' &&
    (pathname === '/app' || pathname.startsWith('/app/'))
  ) {
    return <Navigate to="/app/login" replace />;
  }

  if (netid !== '' && pathname === '/app/login') {
    return <Navigate to="/app/dash" replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterRoutes>
        <Route path="/app" element={<Navigate to="/app/dash" replace />} />
        <Route path="/app/login" element={<Login />} />
        <Route path="/app/dash" element={<Dashboard />} />
        <Route path="/app/links/:id" element={<Stats />} />
        <Route path="/app/orgs" element={<MyOrganizations />} />
        <Route path="/app/orgs/:id" element={<ManageOrg />} />
        <Route path="/app/orgs/:id/tokens" element={<OrganizationToken />} />
        <Route path="/app/faq" element={<Faq />} />
        <Route path="/app/releases" element={<ChangeLog />} />
        <Route
          path="/app/admin"
          element={
            <ProtectedRoute requires="admin">
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="/app/api-reference" element={<ApiReference />} />
        <Route
          path="*"
          element={
            <ErrorPage
              title="Ooops!"
              description="
                    The page you are looking for is not found, are you sure you typed
                    the URL correctly?"
            />
          }
        />
      </RouterRoutes>
    </Suspense>
  );
}
