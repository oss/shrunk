import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FeatureFlags {
  devLogins: boolean;
  trackingPixel: boolean;
  domains: boolean;
  googleSafeBrowsing: boolean;
  helpDesk: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlags>({});

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
      const response = await fetch('/api/v1/enabled');
      const data = (await response.json()) as FeatureFlags;
      setFlags(data);
    };

    fetchFeatureFlags();
  }, []);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
