/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const palette = {
  canvas: '#F5F0E6', surface: '#FFFDF8', surfaceMuted: '#ECE6D8', ink: '#2E241C', inkMuted: '#76695D',
  olive: '#58633A', oliveDark: '#3F4929', oliveSoft: '#DCE3C7', amber: '#C57C2D', amberSoft: '#F7E5C7',
  red: '#A84A3E', redSoft: '#F5DAD4', green: '#387252', greenSoft: '#D9EBDD', border: '#DED5C5',
  white: '#FFFFFF', black: '#17120E',
} as const;

export const typography = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  sans: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'system-ui' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const shadow = Platform.select({
  ios: { shadowColor: palette.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 14 },
  android: { elevation: 3 },
  default: {},
});

// Compatibility exports retained for the small set of untouched Expo template helpers.
export const Colors = {
  light: { text: palette.ink, background: palette.canvas, backgroundElement: palette.surfaceMuted, backgroundSelected: palette.oliveSoft, textSecondary: palette.inkMuted },
  dark: { text: palette.canvas, background: palette.black, backgroundElement: palette.ink, backgroundSelected: palette.oliveDark, textSecondary: palette.border },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export const Fonts = { sans: typography.sans, serif: typography.serif, rounded: typography.sans, mono: typography.mono } as const;
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const BottomTabInset = 0;
export const MaxContentWidth = 1200;
