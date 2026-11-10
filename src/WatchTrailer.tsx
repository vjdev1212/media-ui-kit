import React from 'react';
import { Alert, Linking, Platform, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { NativeButton } from './NativeUiControls';

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
    const iconColor = trailerKey ? color ?? colors.onPrimary : colors.textDim;

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
                    backgroundColor: trailerKey ? colors.primary : colors.backgroundCard,
                    borderColor: colors.primaryBorder,
                },
                !trailerKey && { opacity: 0.5 },
            ]}
            onPress={handlePress}
            disabled={!trailerKey}
        >
            <Ionicons
                name="logo-youtube"
                size={size}
                color={iconColor}
            />
        </NativeButton>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
});

export default WatchTrailerButton;