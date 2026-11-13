import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  ScrollView as RNScrollView,
  StyleSheet,
  useWindowDimensions,
  View as RNView,
} from 'react-native';
import { Text, View } from './Themed';
import { getYear } from './Date';
import { SvgXml } from 'react-native-svg';
import { DefaultPosterImgXml } from './Svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { NativeButton } from './NativeUiControls';
import PosterArtwork from './PosterArtwork';
import { spacing, typography } from './theme';
import type { ThemeColor } from './theme';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const posterCache = new Map<string, PosterItemData[]>();
const CACHE_DURATION = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();
const POSTER_IMAGE_SIZE = 'w500';
const SKELETON_DATA = [1, 2, 3, 4, 5];

interface PosterItemData {
  tmdbid: number;
  name: string;
  poster: string;
  background: string;
  year: string;
  imdbRating: string;
  type: 'movie' | 'series';
  sortValue?: string | number;
}

export interface PosterListSource {
  apiUrl: string;
  type: 'movie' | 'series';
  minimumPopularity?: number;
}

export interface PosterListProps {
  apiUrl: string;
  title: string;
  type: 'movie' | 'series' | 'any';
  sources?: PosterListSource[];
  minimumPopularity?: number;
  compact?: boolean;
  onItemPress: (tmdbId: number, type: 'movie' | 'series') => void;
  onSeeAllPress: (
    apiUrl: string,
    title: string,
    type: 'movie' | 'series' | 'any',
    minimumPopularity?: number,
    sources?: PosterListSource[],
  ) => void;
}

const PosterItem = React.memo(({
  item,
  posterWidth,
  posterHeight,
  cardHeight,
  onItemPress,
}: {
  item: PosterItemData;
  posterWidth: number;
  posterHeight: number;
  cardHeight: number;
  onItemPress: PosterListProps['onItemPress'];
}) => {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const year = item.year?.split('–')[0] || item.year;

  const handlePress = useCallback(() => {
    onItemPress(item.tmdbid, item.type);
  }, [item.tmdbid, item.type, onItemPress]);

  const contents = (
    <>
      <PosterArtwork key={item.poster} style={{ width: posterWidth, height: posterHeight }}>
        {(onImageLoad) => !imgError ? (
          <Image
            source={{ uri: item.poster }}
            onLoad={onImageLoad}
            onError={() => setImgError(true)}
            style={{ width: posterWidth, height: posterHeight }}
            resizeMethod="resize"
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: posterWidth, height: posterHeight, justifyContent: 'center', alignItems: 'center' }}>
            <SvgXml xml={DefaultPosterImgXml} />
          </View>
        )}
      </PosterArtwork>
      <Text numberOfLines={1} style={[styles.posterTitle, { width: posterWidth, color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.posterYear, { color: colors.textMuted }]}>{year}</Text>
    </>
  );
  return (
    <NativeButton
      variant="text"
      onPress={handlePress}
      accessibilityLabel={`Open ${item.name}`}
      style={{ width: posterWidth, height: cardHeight, flexShrink: 0 }}
    >
      {contents}
    </NativeButton>
  );
});

const SkeletonPoster = React.memo(({ posterWidth, posterHeight, cardHeight, bgColor }: {
  posterWidth: number;
  posterHeight: number;
  cardHeight: number;
  bgColor: ThemeColor;
}) => (
  <RNView style={{ width: posterWidth, height: cardHeight, flexShrink: 0 }}>
  <PosterArtwork style={{ width: posterWidth, height: posterHeight, backgroundColor: bgColor }} />
  </RNView>
));

const PosterList = ({
  apiUrl,
  title,
  type,
  sources,
  minimumPopularity,
  compact = false,
  onItemPress,
  onSeeAllPress,
}: PosterListProps) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isPortrait = height >= width;

  const [data, setData] = useState<PosterItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const activeSources = useMemo(
    () => sources ?? (type === 'any' ? [] : [{ apiUrl, type, minimumPopularity }]),
    [apiUrl, minimumPopularity, sources, type],
  );

  const postersPerScreen = useMemo(() => {
    if (shortSide < 580) return isPortrait ? 3 : 5;
    if (shortSide < 1024) return isPortrait ? 6 : 8;
    if (shortSide < 1440) return isPortrait ? 7 : 9;
    return isPortrait ? 7 : 10;
  }, [isPortrait, shortSide]);
  const posterGap = spacing.sm + 4;
  const containerMargin = compact ? spacing.mdLg : spacing.md;

  const posterWidth = useMemo(() => {
    const totalSpacing = posterGap * (postersPerScreen - 1);
    const totalMargins = containerMargin * 2;
    return (width - totalSpacing - totalMargins) / postersPerScreen;
  }, [containerMargin, width, postersPerScreen]);

  const posterHeight = posterWidth * 1.5;
  const posterCardHeight = posterHeight + 58;
  const listContentStyle = useMemo(
    () => ({ height: posterCardHeight + 10 }),
    [posterCardHeight],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const fetchData = async () => {
      const cacheKey = JSON.stringify(activeSources);
      const cachedData = posterCache.get(cacheKey);
      const cacheTime = cacheTimestamps.get(cacheKey);
      const now = Date.now();

      if (cachedData && cacheTime && (now - cacheTime) < CACHE_DURATION) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      try {
        const sourceResults = await Promise.all(activeSources.map(async (source) => {
          const url = new URL(source.apiUrl);
          url.searchParams.set('api_key', EXPO_PUBLIC_TMDB_API_KEY ?? '');
          const response = await fetch(url.toString(), { signal: controller.signal });
          if (!response.ok) throw new Error(`TMDB poster request failed with HTTP ${response.status}.`);
          const result: unknown = await response.json();
          const collection = result && typeof result === 'object' && 'results' in result
            && Array.isArray(result.results)
            ? result.results
            : [];
          const sortBy = url.searchParams.get('sort_by') ?? 'popularity.desc';
          const sortField = sortBy.split('.')[0];

          return collection.flatMap((item): PosterItemData[] => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
            const media = item as Record<string, unknown>;
            if (
              typeof media.id !== 'number'
              || typeof media.poster_path !== 'string'
              || typeof media.backdrop_path !== 'string'
              || (source.minimumPopularity !== undefined
                && (typeof media.popularity !== 'number' || media.popularity < source.minimumPopularity))
            ) return [];

            const releaseDate = typeof media.release_date === 'string'
              ? media.release_date
              : typeof media.first_air_date === 'string' ? media.first_air_date : '';
            const sortValue = sortField === 'release_date'
              || sortField === 'primary_release_date'
              || sortField === 'first_air_date'
              ? releaseDate
              : sortField === 'title' || sortField === 'name'
                ? (typeof media.title === 'string' ? media.title : media.name)
                : sortField === 'original_title' || sortField === 'original_name'
                  ? (typeof media.original_title === 'string' ? media.original_title : media.original_name)
                  : media[sortField];
            return [{
              tmdbid: media.id,
              name: typeof media.title === 'string'
                ? media.title
                : typeof media.name === 'string' ? media.name : '',
              poster: `https://image.tmdb.org/t/p/${POSTER_IMAGE_SIZE}${media.poster_path}`,
              background: `https://image.tmdb.org/t/p/w780${media.backdrop_path}`,
              year: getYear(releaseDate),
              imdbRating: typeof media.vote_average === 'number' ? media.vote_average.toFixed(1) : '',
              type: source.type,
              sortValue: typeof sortValue === 'string' || typeof sortValue === 'number' ? sortValue : undefined,
            }];
          });
        }));

        const formatted = sourceResults.flat();
        if (activeSources.length > 1) {
          const sortBy = new URL(activeSources[0].apiUrl).searchParams.get('sort_by') ?? 'popularity.desc';
          const descending = sortBy.endsWith('.desc');
          formatted.sort((left, right) => {
            if (left.sortValue === undefined) return 1;
            if (right.sortValue === undefined) return -1;
            const comparison = typeof left.sortValue === 'number' && typeof right.sortValue === 'number'
              ? left.sortValue - right.sortValue
              : String(left.sortValue).localeCompare(String(right.sortValue));
            return descending ? -comparison : comparison;
          });
        }

        const limitedItems = formatted.slice(0, 20);
        if (!active) return;
        posterCache.set(cacheKey, limitedItems);
        cacheTimestamps.set(cacheKey, now);
        setData(limitedItems);
      } catch (error) {
        if (!controller.signal.aborted) console.error('Error loading posters', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    void fetchData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeSources]);

  const handleSeeAllPress = useCallback(() => {
    const typeTitle = type === 'movie' ? 'Movies' : type === 'series' ? 'Series' : '';
    const pageTitle = typeTitle && !title.startsWith(`${typeTitle} - `)
      ? `${typeTitle} - ${title}`
      : title;
    onSeeAllPress(apiUrl, pageTitle, type, minimumPopularity, sources);
  }, [apiUrl, minimumPopularity, onSeeAllPress, sources, title, type]);

  const renderPosterItem = useCallback(({ item, index }: { item: PosterItemData; index: number }) => (
    <PosterItem
      item={item}
      posterWidth={posterWidth}
      posterHeight={posterHeight}
      cardHeight={posterCardHeight}
      onItemPress={onItemPress}
    />
  ), [onItemPress, posterCardHeight, posterHeight, posterWidth]);

  if (loading) {
    return (
      <RNView style={[styles.container, compact && styles.compactContainer]}>
        <RNView style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </RNView>
        <RNScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={listContentStyle}
          contentContainerStyle={{ flexDirection: 'row', gap: posterGap, paddingRight: containerMargin }}
        >
          {SKELETON_DATA.map((item, index) => (
            <SkeletonPoster
              key={`skeleton-${index}`}
              posterWidth={posterWidth}
              posterHeight={posterHeight}
              cardHeight={posterCardHeight}
              bgColor={colors.backgroundOverlay}
            />
          ))}
        </RNScrollView>
      </RNView>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <RNView style={[styles.container, compact && styles.compactContainer]}>
      <RNView style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <NativeButton variant="text" onPress={handleSeeAllPress} style={styles.seeAllButton}>
          <Text style={[styles.seeAllText, { color: colors.textMuted }]}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevronIcon} />
        </NativeButton>
      </RNView>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item, index) => `${item.tmdbid}-${index}`}
        renderItem={renderPosterItem}
        initialNumToRender={Math.min(data.length, postersPerScreen + 2)}
        maxToRenderPerBatch={4}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
        style={listContentStyle}
        contentContainerStyle={{ gap: posterGap, paddingRight: containerMargin }}
      />
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: spacing.sm, marginBottom: spacing.lg, marginHorizontal: spacing.md },
  compactContainer: { paddingTop: spacing.xs, marginBottom: spacing.xs, marginHorizontal: spacing.mdLg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.headline },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
  seeAllText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1 },
  chevronIcon: { marginLeft: 2 },
  posterTitle: { height: 20, marginTop: spacing.sm, ...typography.caption, fontWeight: '600' },
  posterYear: { height: 18, marginTop: spacing.xs, ...typography.caption },
});

export default React.memo(PosterList);
