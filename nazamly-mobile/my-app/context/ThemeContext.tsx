import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'nazamly_theme_mode';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = Appearance.getColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemScheme === 'dark');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(stored => {
      if (stored !== null) {
        setIsDark(stored === 'dark');
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Listen to system theme changes (only if user hasn't set a manual preference)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem(THEME_KEY).then(stored => {
        if (stored === null) {
          setIsDark(colorScheme === 'dark');
        }
      });
    });
    return () => sub.remove();
  }, []);

  const setTheme = useCallback((dark: boolean) => {
    setIsDark(dark);
    AsyncStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
