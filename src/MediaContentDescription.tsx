import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { useTheme } from './ThemeContext';
import { NativeButton } from './NativeUiControls';
import { spacing, typography } from './theme';

interface MediaContentDescriptionProps {
  description: string;
  placement?: 'details' | 'poster';
  collapsedLines?: number;
}

const MediaContentDescription: React.FC<MediaContentDescriptionProps> = ({
  description,
  placement = 'details',
  collapsedLines = 3,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!description?.trim()) return null;

  return (
    <View style={[styles.container, placement === 'poster' && styles.posterContainer]}>
      {placement === 'details' && <Text style={styles.heading}>Overview</Text>}
      <NativeButton
        variant="text"
        onPress={() => setExpanded((current) => !current)}
        accessibilityLabel={expanded ? 'Show less description' : 'Show more description'}
      >
        <Text
          style={[styles.description, placement === 'poster' && styles.posterText, placement === 'poster' && { opacity: 0.82 }]}
          numberOfLines={expanded ? 7 : collapsedLines}
          ellipsizeMode="tail"
        >
          {description}
        </Text>
        {description.trim().split(/\s+/).length > 20 && (
          <Text
            style={[
              styles.moreText,
              placement === 'poster' && styles.posterText,
              { color: colors.textMuted },
            ]}
          >
            {expanded ? 'LESS' : 'MORE'}
          </Text>
        )}
      </NativeButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', minHeight: 10, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  posterContainer: { paddingTop: 0, paddingBottom: 0 },
  posterText: { alignSelf: 'stretch', textAlign: 'center' },
  heading: { ...typography.headline, paddingHorizontal: spacing.mdLg },
  description: { ...typography.subhead, paddingHorizontal: spacing.mdLg, marginTop: spacing.sm },
  moreText: { ...typography.caption, marginTop: spacing.xs, paddingHorizontal: spacing.mdLg, textTransform: 'uppercase' },
});

export default MediaContentDescription;
