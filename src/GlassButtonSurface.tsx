import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

interface GlassButtonSurfaceProps {
  children: ReactNode;
  isInteractive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function GlassButtonSurface({
  children,
  isInteractive = true,
  style,
}: GlassButtonSurfaceProps) {
  const [reduceTransparency, setReduceTransparency] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );

    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (active) setReduceTransparency(enabled);
      })
      .catch((error: unknown) => {
        console.error('Failed to check reduced transparency setting:', error);
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const surfaceStyle = [styles.surface, style];
  if (reduceTransparency !== false) {
    return <View style={[surfaceStyle, styles.solidFallback]}>{children}</View>;
  }

  if (Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable()) {
    return (
      <GlassView glassEffectStyle="clear" isInteractive={isInteractive} style={surfaceStyle}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView tint="dark" intensity={75} style={[surfaceStyle, styles.blurFallback]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 999,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  solidFallback: {
    backgroundColor: 'rgba(24, 24, 24, 0.94)',
  },
  blurFallback: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
});
