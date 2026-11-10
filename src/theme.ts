import { Color } from 'expo-router';
import { Platform, type ColorValue, type NativeColorValue } from 'react-native';

export type ThemeColor = string | NativeColorValue;

export type AppColors = {
    primary: ThemeColor;
    onPrimary: ThemeColor;
    danger: ThemeColor;
    rating: ThemeColor;
    background: ThemeColor;
    primaryCard: ThemeColor;
    primaryDark: ThemeColor;
    primaryMuted: ThemeColor;
    primaryBorder: ThemeColor;
    primarySurface: ThemeColor;
    primarySubtle: ThemeColor;
    primaryGhost: ThemeColor;
    primaryFaint: ThemeColor;
    backgroundMid: ThemeColor;
    backgroundCard: ThemeColor;
    backgroundOverlay: ThemeColor;
    gradientBg: readonly [ThemeColor, ThemeColor, ThemeColor];
    gradientOverlay: readonly [ThemeColor, ThemeColor, ThemeColor];
    text: ThemeColor;
    textMuted: ThemeColor;
    textDim: ThemeColor;
    border: ThemeColor;
    borderStrong: ThemeColor;
};

const systemColor = (
    ios: ColorValue,
    android: ColorValue,
    webLight: string,
    webDark: string,
    scheme: 'light' | 'dark',
): ThemeColor => Platform.select({
    ios,
    android,
    default: scheme === 'dark' ? webDark : webLight,
}) as ThemeColor;

const createColors = (scheme: 'light' | 'dark'): AppColors => {
    const background = systemColor(Color.ios.systemGroupedBackground, Color.android.dynamic.surface, 'Canvas', 'Canvas', scheme);
    const card = systemColor(Color.ios.secondarySystemGroupedBackground, Color.android.dynamic.surfaceContainerLow, 'Canvas', 'Canvas', scheme);
    const secondaryCard = systemColor(Color.ios.tertiarySystemBackground, Color.android.dynamic.surfaceContainer, 'ButtonFace', 'ButtonFace', scheme);
    const text = systemColor(Color.ios.label, Color.android.dynamic.onSurface, 'CanvasText', 'CanvasText', scheme);
    const textMuted = systemColor(Color.ios.secondaryLabel, Color.android.dynamic.onSurfaceVariant, 'GrayText', 'GrayText', scheme);
    const textDim = systemColor(Color.ios.tertiaryLabel, Color.android.dynamic.onSurfaceVariant, 'GrayText', 'GrayText', scheme);
    const border = systemColor(Color.ios.separator, Color.android.dynamic.outlineVariant, 'GrayText', 'GrayText', scheme);
    const primary = text;

    return {
        primary,
        onPrimary: systemColor(Color.ios.systemBackground, Color.android.dynamic.surface, 'Canvas', 'Canvas', scheme),
        danger: systemColor(Color.ios.systemRed, Color.android.dynamic.error, 'MarkText', 'MarkText', scheme),
        rating: systemColor(Color.ios.systemYellow, Color.android.dynamic.tertiary, 'Mark', 'Mark', scheme),
        background,
        primaryCard: card,
        primaryDark: primary,
        primaryMuted: systemColor(Color.ios.secondarySystemFill, Color.android.dynamic.secondaryContainer, 'ButtonFace', 'ButtonFace', scheme),
        primaryBorder: border,
        primarySurface: systemColor(Color.ios.secondarySystemGroupedBackground, Color.android.dynamic.surfaceVariant, 'ButtonFace', 'ButtonFace', scheme),
        primarySubtle: secondaryCard,
        primaryGhost: systemColor(Color.ios.quaternarySystemFill, Color.android.dynamic.surfaceContainerLow, 'ButtonFace', 'ButtonFace', scheme),
        primaryFaint: systemColor(Color.ios.tertiarySystemFill, Color.android.dynamic.surfaceContainerLowest, 'ButtonFace', 'ButtonFace', scheme),
        backgroundMid: card,
        backgroundCard: card,
        backgroundOverlay: secondaryCard,
        gradientBg: [background, card, background],
        gradientOverlay: ['transparent', secondaryCard, background],
        text,
        textMuted,
        textDim,
        border,
        borderStrong: systemColor(Color.ios.opaqueSeparator, Color.android.dynamic.outline, 'GrayText', 'GrayText', scheme),
    };
};

export const LightColors = createColors('light');
export const DarkColors = createColors('dark');
export const Colors = LightColors;
export const systemDarkBackground = DarkColors.background;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    mdLg: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export const radius = {
    sm: 10,
    md: 14,
    lg: 20,
    capsule: 999,
} as const;

export const typography = {
    largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.3 },
    title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0.1 },
    headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
    body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
    subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;
