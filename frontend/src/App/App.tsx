import { useContext } from 'react';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeatureFlagsProvider } from '@/App/FeatureFlagsContext';
import { DarkModeContext, DarkModeProvider } from '@/App/DarkModeContext';
import { SessionProvider } from '@/App/SessionContext';
import { Shell } from '@/App/Shell';
import { Routes } from '@/App/Routes';

export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status !== undefined && status >= 400 && status < 500
    ? false
    : failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
    },
  },
});

function ThemedApp() {
  const { darkMode } = useContext(DarkModeContext);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <BrowserRouter>
        <Shell>
          <Routes />
        </Shell>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <DarkModeProvider>
          <FeatureFlagsProvider>
            <ThemedApp />
          </FeatureFlagsProvider>
        </DarkModeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
