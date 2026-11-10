import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './Themed';
import { NativeButton } from './NativeUiControls';
import { radius, spacing, typography } from './theme';
import { useTheme } from './ThemeContext';

const PlayButton = ({ onPress }: { onPress: () => void }) => {
  const { colors } = useTheme();

  return (
    <NativeButton
      variant="filled"
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={onPress}
    >
      <Ionicons name="play-outline" size={24} color={colors.onPrimary} style={styles.icon} />
      <Text style={[styles.text, { color: colors.onPrimary }]}>Watch Now</Text>
    </NativeButton>
  );
};
const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.capsule,
    minWidth: 156,
    alignItems: 'center',
    marginVertical: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  text: {
    ...typography.headline,
  },
  icon: {
    marginRight: 8,
  }
});

export default PlayButton;