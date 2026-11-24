import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { spacing, typography } from './theme';

interface MediaContentDescriptionProps {
  description: string;
  placement?: 'details' | 'poster';
}

const MediaContentDescription: React.FC<MediaContentDescriptionProps> = ({
  description,
  placement = 'details',
}) => {
  if (!description?.trim()) return null;

  return (
    <View style={[styles.container, placement === 'poster' && styles.posterContainer]}>
      {placement === 'details' && <Text style={styles.heading}>Overview</Text>}
      <Text
        style={[styles.description, placement === 'poster' && styles.posterText]}
        numberOfLines={3}
        ellipsizeMode="tail"
      >
        {description}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', minHeight: 10, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  posterContainer: { paddingTop: 0, paddingBottom: 0 },
  posterText: { alignSelf: 'stretch', textAlign: 'center' },
  heading: { ...typography.headline, paddingHorizontal: spacing.mdLg },
  description: { ...typography.subhead, paddingHorizontal: spacing.mdLg, marginTop: spacing.sm },
});

export default MediaContentDescription;