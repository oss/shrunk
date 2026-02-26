import { useState, useEffect } from 'react';

export default function useDarkMode() {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('darkMode') === 'true',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');

    // Dispatch custom event when darkMode changes
    window.dispatchEvent(
      new CustomEvent('darkModeChange', { detail: darkMode }),
    );
  }, [darkMode]);

  // Listen for changes from other components
  useEffect(() => {
    const handleDarkModeChange = (e: CustomEvent) => {
      setDarkMode(e.detail);
    };

    window.addEventListener(
      'darkModeChange',
      handleDarkModeChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'darkModeChange',
        handleDarkModeChange as EventListener,
      );
    };
  }, []);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  return { darkMode, toggleTheme, setDarkMode };
}
