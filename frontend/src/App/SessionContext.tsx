import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { getUserInfo, logout as logoutRequest } from '@/App/Api';
import { getErrorMessage } from '@/Shared/Lib/Http';

export type SessionValue = {
  netid: string;
  privileges: Set<string>;
  isLoading: boolean;
  motd: string;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

export const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [netid, setNetid] = useState('');
  const [privileges, setPrivileges] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [motd, setMotd] = useState('');

  const refreshSession = useCallback(async () => {
    const data = await getUserInfo();
    setNetid(data.netid);
    setPrivileges(new Set(data.privileges));
    setMotd(data.motd ?? '');
  }, []);

  useEffect(() => {
    void refreshSession()
      .catch((error) =>
        toast.error(getErrorMessage(error, 'Unable to restore your session.')),
      )
      .finally(() => setIsLoading(false));
  }, [refreshSession]);

  const logout = async () => {
    // Intentional: the backend may return a CAS logout URL on a different
    // origin — no router-level way to navigate cross-origin, so
    // window.location is correct here.
    try {
      window.location.href = await logoutRequest();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to sign out.'));
    }
  };

  return (
    <SessionContext.Provider
      value={{ netid, privileges, isLoading, motd, refreshSession, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}
