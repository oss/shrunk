import React, { createContext, useContext, useState, useEffect } from 'react';
import { FeatureFlags } from '@/interfaces/app';
import { getFeatureFlags } from '@/api/app';

const FeatureFlagsContext = createContext<FeatureFlags>({
  devLogins: false,
  trackingPixel: false,
  domains: false,
  googleSafeBrowsing: false,
  helpDesk: false,
});

export const useFeatureFlags = () =>
  useContext<FeatureFlags>(FeatureFlagsContext);

export const FeatureFlagsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [flags, setFlags] = useState<FeatureFlags>({
    devLogins: false,
    trackingPixel: false,
    domains: false,
    googleSafeBrowsing: false,
    helpDesk: false,
  });

  useEffect(() => {
    const fetchFeatureFlags = async () => {
      getFeatureFlags().then((data) => setFlags(data));
    };

    fetchFeatureFlags();
  }, []);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
