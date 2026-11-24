import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { DarkColors, LightColors } from './theme';
import type { AppColors } from './theme';

interface ThemeOverride {
  colorScheme: 'light' | 'dark';
  colors?: AppColors;
}

const ThemeOverrideContext = createContext<ThemeOverride | null>(null);

export function ThemeOverrideProvider({
  colorScheme,
  colors,
  children,
}: {
  colorScheme: 'light' | 'dark';
  colors?: AppColors;
  children: ReactNode;
}) {
  return (
    <ThemeOverrideContext.Provider value={{ colorScheme, colors }}>
      {children}
    </ThemeOverrideContext.Provider>
  );
}

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const override = useContext(ThemeOverrideContext);
  const colorScheme = override?.colorScheme ?? (systemColorScheme === 'dark' ? 'dark' : 'light');
  const colors = override?.colors ?? (colorScheme === 'light' ? LightColors : DarkColors);

  return {
    colors,
    colorScheme,
  } as const;
}
