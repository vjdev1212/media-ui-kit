import { useState, useEffect, useMemo, useCallback } from 'react';
import { Animated, StyleSheet, useWindowDimensions, Image } from 'react-native';
import { Text, View } from './Themed';

interface MediaLogoProps {
  logo: string;
  title: string;
  textColor?: string;
}

const ANIMATION_DURATION = 500;
const PORTRAIT_LOGO_WIDTH = 120;
const LANDSCAPE_LOGO_HEIGHT = 100;
const PORTRAIT_FONT_SIZE = 25;
const LANDSCAPE_FONT_SIZE = 35;
const LOGO_ASPECT_RATIO = 16 / 9;

export default function MediaLogo({ logo, title, textColor = '#ffffff' }: MediaLogoProps) {
  const [titleFadeAnim] = useState(() => new Animated.Value(0));
  const [logoError, setLogoError] = useState(false);
  const { width, height } = useWindowDimensions();

  const computedValues = useMemo(() => {
    const isPortrait = height > width;
    return {
      fontSize: isPortrait ? PORTRAIT_FONT_SIZE : LANDSCAPE_FONT_SIZE,
      logoWidth: isPortrait ? PORTRAIT_LOGO_WIDTH : null,
      logoHeight: isPortrait ? null : LANDSCAPE_LOGO_HEIGHT,
      alignSelf: isPortrait ? 'center' : 'auto',
    };
  }, [height, width]);

  const animatedContainerStyle = useMemo(() => ({
    ...styles.logoContainer,
    opacity: titleFadeAnim,
    alignSelf: computedValues.alignSelf as 'center' | 'auto',
  }), [titleFadeAnim, computedValues.alignSelf]);

  const logoStyle = useMemo(() => ({
    ...styles.logo,
    width: computedValues.logoWidth,
    height: computedValues.logoHeight,
  }), [computedValues.logoWidth, computedValues.logoHeight]);

  const titleTextStyle = useMemo(() => ({
    ...styles.titleText,
    color: textColor,
    fontSize: computedValues.fontSize,
  }), [computedValues.fontSize, textColor]);

  const handleLogoError = useCallback(() => {
    setLogoError(true);
  }, []);

  useEffect(() => {
    const animation = Animated.timing(titleFadeAnim, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [titleFadeAnim]);

  useEffect(() => {
    setLogoError(false);
  }, [logo]);

  if (!logo && !title) return null;

  return (
    <Animated.View style={animatedContainerStyle}>
      {!logoError && logo ? (
        <Image
          resizeMode="contain"
          source={{ uri: logo }}
          style={logoStyle}
          onError={handleLogoError}
        />
      ) : (
        <View style={styles.titleContainer}>
          <Text style={titleTextStyle} ellipsizeMode="tail">
            {title}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  logo: {
    aspectRatio: LOGO_ASPECT_RATIO,
  },
  titleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    padding: 10,
  },
  titleText: {
    fontWeight: '500',
    overflow: 'hidden',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
