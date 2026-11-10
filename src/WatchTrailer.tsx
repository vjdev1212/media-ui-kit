import React from 'react';
import { Alert, Linking, Platform, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from './ThemeContext';
import { NativeButton } from './NativeUiControls';
import { radius } from './theme';

interface WatchTrailerButtonProps {
    trailerKey: string | null;
    size?: number;
    color?: string;
}

const WatchTrailerButton: React.FC<WatchTrailerButtonProps> = ({
    trailerKey,
    size = 28,
    color,
}) => {
    const { colors } = useTheme();
    const iconColor = trailerKey ? color ?? colors.text : colors.textDim;

    const handlePress = async () => {
        if (!trailerKey) return;
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            await Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
        } catch (error) {
            console.error('Error opening trailer:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to open trailer');
            } else {
                Alert.alert('Error', 'Failed to open trailer');
            }
        }
    };

    return (
        <NativeButton
            variant="text"
            style={[
                styles.button,
                {
                    backgroundColor: colors.primarySurface,
                    borderColor: colors.primaryBorder,
                },
                !trailerKey && { opacity: 0.5 },
            ]}
            onPress={handlePress}
            disabled={!trailerKey}
            accessibilityLabel="Watch trailer on YouTube"
        >
            <Svg width={size} height={size} viewBox="0 0 24 24">
                <Rect
                    x={2.5}
                    y={5.5}
                    width={19}
                    height={13}
                    rx={3}
                    fill="none"
                    stroke={iconColor}
                    strokeWidth={1.8}
                />
                <Path d="M10 9L15.5 12L10 15V9Z" fill={iconColor} />
            </Svg>
        </NativeButton>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 50,
        height: 50,
        borderRadius: radius.capsule,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
});

export default WatchTrailerButton;