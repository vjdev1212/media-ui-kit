import React from 'react';
import { View, StyleSheet, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';

interface BlurGradientBackgroundProps {
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
    colors?: readonly [Exclude<ColorValue, null>, Exclude<ColorValue, null>, ...Exclude<ColorValue, null>[]];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    borderRadius?: number;
}

export default function BlurGradientBackground({
    intensity = 40,
    tint = 'dark',
    colors,
    start = { x: 0, y: 0 },
    end = { x: 0, y: 1 },
    borderRadius = 0,
}: BlurGradientBackgroundProps) {
    const { colors: themeColors } = useTheme();
    const gradientColors = colors ?? themeColors.gradientBg;

    return (
        <View
            pointerEvents="none"
            style={[
                StyleSheet.absoluteFill,
                {
                    overflow: 'hidden',
                    borderRadius,
                },
            ]}
        >           
            <LinearGradient
                colors={gradientColors}
                start={start}
                end={end}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={[themeColors.primarySurface, 'rgba(0,0,0,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}