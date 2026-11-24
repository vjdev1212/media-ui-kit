import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Animated, ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { View } from './Themed';
import { useTheme } from './ThemeContext';
import { radius } from './theme';
import PosterVignette from './PosterVignette';

interface MediaContentPosterProps {
  background: string;
  isPortrait: boolean;
  scrollY?: SharedValue<number>;
}

const MediaContentPoster: React.FC<MediaContentPosterProps> = ({ background, isPortrait, scrollY }) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [posterHeight, setPosterHeight] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const localScrollY = useSharedValue(0);
  const scrollOffset = scrollY ?? localScrollY;
  const reduceMotion = useReducedMotion();
  const imageZoomStyle = useAnimatedStyle(() => {
    if (reduceMotion || posterHeight <= 0) return {};

    const progress = interpolate(
      scrollOffset.get(),
      [0, posterHeight],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateY: progress * posterHeight * 0.18 },
        { scale: 1 + progress * 0.12 },
      ],
    };
  }, [posterHeight, reduceMotion, scrollOffset]);

  const startAnimations = useCallback(() => {
    setIsLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setPosterHeight(event.nativeEvent.layout.height);
  }, []);

  return (
    <Reanimated.View
      onLayout={handleLayout}
      style={[styles.posterContainer, { aspectRatio: isPortrait ? 3 / 4 : 16 / 9 }]}
    >
      <Animated.View style={[styles.shadowContainer, { borderRadius: isPortrait ? 0 : radius.md }]}>
        {isLoading && (
          <Animated.View style={styles.loaderContainer}>
            <ActivityIndicator color={colors.primary} />
          </Animated.View>
        )}
        <Reanimated.View style={[StyleSheet.absoluteFill, imageZoomStyle]}>
          <Animated.Image
            resizeMode={isPortrait ? 'cover' : 'contain'}
            resizeMethod="resize"
            source={{ uri: background }}
            style={[styles.poster, { opacity: fadeAnim, borderRadius: isPortrait ? 0 : radius.md }]}
            onLoad={startAnimations}
          />
        </Reanimated.View>
        <PosterVignette />
      </Animated.View>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  posterContainer: { position: 'relative', width: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  shadowContainer: { width: '100%', height: '100%', backgroundColor: 'transparent', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)' },
  poster: { width: '100%', height: '100%' },
  loaderContainer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
});

export default MediaContentPoster;