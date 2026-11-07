import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeButton } from './NativeUiControls';
import { useTheme } from './ThemeContext';
import { radius } from './theme';

export interface LibraryButtonItem {
  id: string;
  tmdbid: string;
  type: 'movie' | 'series';
  title: string;
  poster: string;
  backdrop: string;
  year?: string;
  rating?: string;
  genres?: string[];
}

export interface LibraryButtonService {
  isInLibrary(tmdbid: string, type: LibraryButtonItem['type']): Promise<boolean>;
  addToLibrary(item: LibraryButtonItem): Promise<boolean>;
  removeFromLibrary(tmdbid: string, type: LibraryButtonItem['type']): Promise<boolean>;
}

export interface LibraryButtonProps {
  item: LibraryButtonItem;
  service: LibraryButtonService;
  onPressFeedback?: () => void | Promise<void>;
  size?: number;
  color?: string;
}

export default function LibraryButton({
  item,
  service,
  onPressFeedback,
  size = 28,
  color = '#fff',
}: LibraryButtonProps) {
  const { colors } = useTheme();
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void service.isInLibrary(item.tmdbid, item.type)
      .then((exists) => {
        if (active) setIsInLibrary(exists);
      })
      .catch((error: unknown) => {
        console.error('Error checking library status:', error);
      });
    return () => {
      active = false;
    };
  }, [item.tmdbid, item.type, service]);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onPressFeedback?.();
      const succeeded = isInLibrary
        ? await service.removeFromLibrary(item.tmdbid, item.type)
        : await service.addToLibrary(item);
      if (succeeded) setIsInLibrary(!isInLibrary);
    } catch (error) {
      console.error('Error toggling library status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NativeButton
      variant="text"
      onPress={handlePress}
      style={[
        styles.button,
        { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder },
        isInLibrary && { backgroundColor: colors.primaryMuted, opacity: 0.5 },
      ]}
      disabled={loading}
      seedColor={colors.primary}
    >
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Ionicons name={isInLibrary ? 'bookmark' : 'bookmark-outline'} size={size} color={color} />
      }
    </NativeButton>
  );
}

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
