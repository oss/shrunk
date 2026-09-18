import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FeatureFlags } from '@/App/Types';
import { getFeatureFlags } from '@/App/Api';

const DEFAULT_FLAGS: FeatureFlags = {
  devLogins: false,
  trackingPixel: false,
  domains: false,
  googleSafeBrowsing: false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

export const useFeatureFlags = () =>
  useContext<FeatureFlags>(FeatureFlagsContext);

export const FeatureFlagsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const flagsQuery = useQuery({
    queryKey: ['app', 'feature-flags'],
    queryFn: getFeatureFlags,
  });
  const flags = flagsQuery.data ?? DEFAULT_FLAGS;

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
