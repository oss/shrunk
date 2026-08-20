import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FeatureFlags } from '@/Interfaces/App';
import { getFeatureFlags } from '@/Api/App';
import { getErrorMessage } from '@/Api/Client';

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
    let cancelled = false;

    const fetchFeatureFlags = async () => {
      try {
        const data = await getFeatureFlags();
        if (!cancelled) {
          setFlags(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getErrorMessage(error, 'Unable to load application features.'),
          );
        }
      }
    };

    void fetchFeatureFlags();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
