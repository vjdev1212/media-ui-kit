import { useColorScheme } from 'react-native';
import { DarkColors, LightColors } from './theme';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme === 'dark' ? 'dark' : 'light';

  return {
    colors: colorScheme === 'light' ? LightColors : DarkColors,
    colorScheme,
  } as const;
}
