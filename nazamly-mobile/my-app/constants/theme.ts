import { Platform } from 'react-native';
import { useThemeMode } from '@/context/ThemeContext';

const tintColorLight = '#3F51B5';
const tintColorDark = '#7986CB';

export const Colors = {
  light: {
    text: '#1A1F36',
    background: '#F5F6FA',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#E8EAF6',
    background: '#0F1120',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

/** Nazamly Academic Clarity — Light Tokens */
export const N = {
  indigo: '#3F51B5',
  indigoLight: '#7986CB',
  indigoPale: '#E8EAF6',
  indigoDark: '#283593',

  teal: '#26A69A',
  tealLight: '#E0F2F1',
  amber: '#FF8F00',
  amberLight: '#FFF8E1',
  green: '#43A047',
  greenLight: '#E8F5E9',
  red: '#EF4444',
  redLight: '#FEF2F2',

  bg: '#F5F6FA',
  card: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#F1F5F9',

  textPrimary: '#1A1F36',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  shadow: {
    color: '#000',
    offset: { width: 0, height: 2 },
    opacity: 0.07,
    radius: 8,
    elevation: 3,
  },

  radius: { sm: 10, md: 16, lg: 24 },
} as const;

/** Nazamly Academic Clarity — Dark Tokens */
export const D = {
  indigo: '#7986CB',
  indigoLight: '#9FA8DA',
  indigoPale: '#1A1F3A',
  indigoDark: '#5C6BC0',

  teal: '#4DB6AC',
  tealLight: '#0D2A28',
  amber: '#FFB300',
  amberLight: '#2A2000',
  green: '#66BB6A',
  greenLight: '#0D2210',
  red: '#F87171',
  redLight: '#2D0F0F',

  bg: '#0F1120',
  card: '#1A1F36',
  border: '#2D3561',
  divider: '#1E2444',

  textPrimary: '#E8EAF6',
  textSecondary: '#9FA8DA',
  textMuted: '#5C6BC0',

  shadow: {
    color: '#000',
    offset: { width: 0, height: 2 },
    opacity: 0.35,
    radius: 8,
    elevation: 6,
  },

  radius: { sm: 10, md: 16, lg: 24 },
} as const;

/** Single hook — returns isDark + matching token set */
export function useAppTheme() {
  const { isDark, toggleTheme, setTheme } = useThemeMode();
  return {
    isDark,
    toggleTheme,
    setTheme,
    colors: (isDark ? D : N) as typeof N,
  } as const;
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
