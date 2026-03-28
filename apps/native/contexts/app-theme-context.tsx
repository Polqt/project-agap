import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

type AppThemeContextValue = {
  isLight: boolean;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [isLight, setIsLight] = useState(true);

  const value = useMemo(
    () => ({
      isLight,
      toggleTheme: () => {
        setIsLight((current) => !current);
      },
    }),
    [isLight],
  );

  return (
    <SafeAreaProvider>
      <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
    </SafeAreaProvider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }

  return context;
}
