import React, {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type ThemePreference = 'light' | 'dark' | 'system';

type DarkModeEventDetail = {
  preference: ThemePreference;
  darkMode: boolean;
};

type DarkModeContextValue = {
  darkMode: boolean;
  setDarkMode: (value: ThemePreference) => void;
  isFollowingSystem: boolean;
};

export const DarkModeContext = createContext<DarkModeContextValue>({
  darkMode: false,
  setDarkMode: () => {},
  isFollowingSystem: true,
});

type DarkModeProviderProps = {
  children: ReactNode;
};

export function DarkModeProvider({ children }: DarkModeProviderProps) {
  const getStoredPreference = (): ThemePreference => {
    if (typeof window === 'undefined') return 'system';

    const stored = window.localStorage.getItem('darkMode');

    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }

    return 'system';
  };

  const getSystemPreference = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [themePreference, setThemePreference] =
    useState<ThemePreference>(getStoredPreference);

  const [systemPrefersDark, setSystemPrefersDark] =
    useState<boolean>(getSystemPreference);

  const darkMode =
    themePreference === 'system'
      ? systemPrefersDark
      : themePreference === 'dark';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
    }

    if (typeof window === 'undefined') return;

    if (themePreference === 'system') {
      window.localStorage.removeItem('darkMode');
    } else {
      window.localStorage.setItem('darkMode', themePreference);
    }

    window.dispatchEvent(
      new CustomEvent<DarkModeEventDetail>('darkModeChange', {
        detail: {
          preference: themePreference,
          darkMode,
        },
      }),
    );
  }, [themePreference, darkMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleDarkModeChange = (event: Event) => {
      const { detail } = event as CustomEvent<DarkModeEventDetail>;
      if (!detail) return;

      setThemePreference(detail.preference);
    };

    window.addEventListener('darkModeChange', handleDarkModeChange);

    return () => {
      window.removeEventListener('darkModeChange', handleDarkModeChange);
    };
  }, []);

  const setDarkModePreference = (value: ThemePreference) => {
    if (value === 'system') {
      setSystemPrefersDark(getSystemPreference());
      setThemePreference('system');
      return;
    }

    setThemePreference(value);
  };

  const contextValue = {
    darkMode,
    setDarkMode: setDarkModePreference,
    isFollowingSystem: themePreference === 'system',
  };

  return (
    <DarkModeContext.Provider value={contextValue}>
      {children}
    </DarkModeContext.Provider>
  );
}
