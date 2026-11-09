import React, { useCallback, useEffect, useState } from 'react';
import {
    Image,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    useWindowDimensions,
    View as RNView,
} from 'react-native';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { Button as NativeButton, Column as NativeColumn, RNHostView, Row as NativeRow, Text as NativeText } from '@expo/ui';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StatusBar, Text, View } from './Themed';
import { WebMenu } from './WebMenuView';
import PosterArtwork from './PosterArtwork';
import { getYear } from './Date';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import NativeStackList from './NativeStackList';
import { spacing, typography } from './theme';

export interface MediaGridProps {
    apiUrl?: string;
    apiKey?: string;
    detailsPath: '/movie/details' | '/series/details';
    items?: MediaGridItem[];
    compact?: boolean;
    showGenres?: boolean;
    yearOnSeparateLine?: boolean;
    safeAreaEdges?: Edge[];
    onItemPress: (item: MediaGridItem) => void;
    getZoomHref?: (item: MediaGridItem) => Href;
    onAddToWatchlist?: (item: MediaGridItem) => Promise<boolean>;
    onActionError?: (title: string, message: string) => void;
}

export interface MediaGridItem {
    tmdbid: number;
    name: string;
    year: string;
    poster: string;
    background: string;
    imdbRating?: string;
    imdbid?: string;
    genres: string[];
    type?: 'movie' | 'series';
    popularity?: number;
}

interface TMDBMediaItem {
    id: number;
    title?: string;
    name?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    imdb_id?: string;
    genre_ids?: number[];
}

export const GENRE_NAMES: Record<number, string> = {
    12: 'Adventure',
    14: 'Fantasy',
    16: 'Animation',
    18: 'Drama',
    27: 'Horror',
    28: 'Action',
    35: 'Comedy',
    36: 'History',
    37: 'Western',
    53: 'Thriller',
    80: 'Crime',
    99: 'Documentary',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    10751: 'Family',
    10752: 'War',
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    10770: 'TV Movie',
    878: 'Science Fiction',
};

const MEDIA_MENU_ACTIONS: MenuAction[] = [
    { id: 'open', title: 'Go to Show', image: 'arrow.up.right' },
    { id: 'watchlist', title: 'Add to Watchlist', image: 'bookmark' },
    { id: 'share', title: 'Share Show', image: 'square.and.arrow.up' },
];

const ROW_HORIZONTAL_PADDING = 16;
const POSTER_WIDTH = 88;
const POSTER_TEXT_GAP = 16;
const MENU_ACTION_WIDTH = 56;

const MediaGrid: React.FC<MediaGridProps> = ({
    apiUrl,
    apiKey,
    detailsPath,
    items,
    compact = false,
    showGenres = true,
    yearOnSeparateLine = false,
    safeAreaEdges = ['left', 'right', 'bottom'],
    onItemPress,
    getZoomHref,
    onAddToWatchlist,
    onActionError,
}) => {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [data, setData] = useState<MediaGridItem[]>([]);
    const [loading, setLoading] = useState(items === undefined && Boolean(apiUrl));
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const rowWidth = Math.max(0, width - insets.left - insets.right);
    const posterWidth = compact ? 64 : POSTER_WIDTH;
    const posterHeight = compact ? 96 : 132;
    const posterTextGap = compact ? 12 : POSTER_TEXT_GAP;
    const rowHorizontalPadding = compact ? 24 : ROW_HORIZONTAL_PADDING;
    const menuActionWidth = compact ? 40 : MENU_ACTION_WIDTH;
    const mediaButtonWidth = Math.max(
        0,
        rowWidth - rowHorizontalPadding * 2 - menuActionWidth,
    );
    const mediaInfoWidth = Math.max(
        0,
        mediaButtonWidth - posterWidth - posterTextGap,
    );

    useEffect(() => {
        if (items !== undefined) {
            setData(items);
            setLoading(false);
            setError(null);
            return;
        }
        if (!apiUrl) {
            setData([]);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const separator = apiUrl.includes('?') ? '&' : '?';
                if (!apiKey) throw new Error('TMDB API key is not configured.');
                const response = await fetch(`${apiUrl}${separator}api_key=${apiKey}`, { signal: controller.signal });
                if (!response.ok) throw new Error(`Request failed (${response.status}).`);
                const result = await response.json();
                if (result?.results) {
                    setData(result.results
                        .filter((item: TMDBMediaItem) => item.poster_path && item.backdrop_path)
                        .map((item: TMDBMediaItem) => ({
                            tmdbid: item.id,
                            name: item.title || item.name || '',
                            year: getYear(item.release_date || item.first_air_date || ''),
                            poster: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
                            background: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
                            imdbRating: item.vote_average?.toFixed(1),
                            imdbid: item.imdb_id,
                            type: detailsPath === '/movie/details' ? 'movie' : 'series',
                            genres: (item.genre_ids ?? [])
                                .map((genreId) => GENRE_NAMES[genreId])
                                .filter((genre): genre is string => Boolean(genre)),
                        })));
                }
            } catch (fetchError) {
                if (!controller.signal.aborted) {
                    setError(fetchError instanceof Error ? fetchError.message : 'Unable to load titles.');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        void fetchData();
        return () => controller.abort();
    }, [apiKey, apiUrl, detailsPath, items, retryCount]);

    const handleMenuAction = useCallback(async (actionId: string, item: MediaGridItem) => {
        if (actionId === 'open') {
            onItemPress(item);
            return;
        }

        if (actionId === 'watchlist' && onAddToWatchlist) {
            try {
                const added = await onAddToWatchlist(item);
                if (!added) onActionError?.('Watchlist', 'This title could not be added. It may already be in your watchlist.');
            } catch (error) {
                console.error('Error adding title to watchlist:', error);
                onActionError?.('Watchlist', 'Unable to add this title to your watchlist.');
            }
            return;
        }

        if (actionId === 'share') {
            const type = (item.type ?? (detailsPath === '/movie/details' ? 'movie' : 'series')) === 'movie'
                ? 'movie'
                : 'tv';
            const url = `https://www.themoviedb.org/${type}/${item.tmdbid}`;
            try {
                await Share.share({ message: `${item.name}\n${url}`, url });
            } catch (error) {
                console.error('Error sharing title:', error);
                onActionError?.('Share', 'Unable to share this title.');
            }
        }
    }, [detailsPath, onActionError, onAddToWatchlist, onItemPress]);

    const menuActions = onAddToWatchlist
        ? MEDIA_MENU_ACTIONS
        : MEDIA_MENU_ACTIONS.filter(({ id }) => id !== 'watchlist');
    const webMenuActions = menuActions.map(({ id, title }) => ({ id: id ?? title, title }));

    const renderItem = useCallback((item: MediaGridItem) => {
        const mediaType = (item.type ?? (detailsPath === '/movie/details' ? 'movie' : 'series')) === 'movie'
            ? 'Movie'
            : 'TV Show';
        const year = item.year?.split('–')[0];
        const metadata = yearOnSeparateLine
            ? mediaType
            : [mediaType, year].filter(Boolean).join(' · ');
        const secondaryMetadata = showGenres && item.genres.length > 0
            ? item.genres.join(' · ')
            : showGenres && item.imdbRating ? `★ ${item.imdbRating}` : undefined;
        const menuButton = (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More actions for ${item.name}`}
                hitSlop={10}
                style={styles.menuButton}
            >
                <Ionicons name="ellipsis-horizontal" size={21} color={colors.text} />
            </Pressable>
        );

        const menu = Platform.OS === 'web' ? (
            <WebMenu
                title={item.name}
                actions={webMenuActions}
                onPressAction={(actionId) => void handleMenuAction(actionId, item)}
            >
                {menuButton}
            </WebMenu>
        ) : (
            <MenuView
                title={item.name}
                actions={menuActions}
                shouldOpenOnLongPress={false}
                colorScheme="dark"
                onPressAction={({ nativeEvent }) => void handleMenuAction(nativeEvent.event, item)}
            >
                {menuButton}
            </MenuView>
        );

        const zoomHref = getZoomHref?.(item);
        const mediaButton = (
            <NativeButton
                variant="text"
                onPress={() => {
                    if (Platform.OS !== 'ios' || !zoomHref) onItemPress(item);
                }}
                style={{ width: mediaButtonWidth }}
            >
                <NativeRow alignment="start" spacing={posterTextGap}>
                    <RNHostView matchContents>
                        <PosterArtwork key={item.poster ?? 'placeholder'} style={[
                            styles.posterFrame,
                            { width: posterWidth, height: posterHeight },
                        ]}>
                            {(onImageLoad) => item.poster ? (
                                <Image
                                    source={{ uri: item.poster }}
                                    onLoad={onImageLoad}
                                    resizeMethod="resize"
                                    style={[
                                        styles.poster,
                                        { width: posterWidth, height: posterHeight, backgroundColor: colors.backgroundOverlay },
                                    ]}
                                    resizeMode="cover"
                                />
                            ) : (
                                <RNView style={[
                                    styles.posterPlaceholder,
                                    { width: posterWidth, height: posterHeight, backgroundColor: colors.backgroundOverlay },
                                ]}>
                                    <Ionicons name="film-outline" size={compact ? 20 : 30} color={colors.textDim} />
                                </RNView>
                            )}
                        </PosterArtwork>
                    </RNHostView>
                    <NativeColumn alignment="start" spacing={compact ? 3 : 7} style={{ width: mediaInfoWidth, paddingTop: spacing.xs }}>
                        <NativeText textStyle={compact ? styles.compactMediaTitle : styles.mediaTitle}>
                            {item.name}
                        </NativeText>
                        {metadata && (
                            <NativeText textStyle={{
                                ...(compact ? styles.compactMediaMetadata : styles.mediaMetadata),
                                color: `${colors.text}CC`,
                            }}>
                                {metadata}
                            </NativeText>
                        )}
                        {yearOnSeparateLine && year && (
                            <NativeText textStyle={{
                                ...(compact ? styles.compactMediaMetadata : styles.mediaMetadata),
                                color: `${colors.text}CC`,
                            }}>
                                {year}
                            </NativeText>
                        )}
                        {secondaryMetadata && (
                            <NativeText textStyle={{
                                ...(compact ? styles.compactMediaMetadata : styles.mediaMetadata),
                                color: `${colors.text}CC`,
                            }}>
                                {secondaryMetadata}
                            </NativeText>
                        )}
                    </NativeColumn>
                </NativeRow>
            </NativeButton>
        );
        const linkedMediaButton = Platform.OS === 'ios' && zoomHref ? (
            <Link href={zoomHref} asChild>
                <Link.Trigger withAppleZoom>{mediaButton}</Link.Trigger>
            </Link>
        ) : mediaButton;

        return (
            <NativeColumn style={{ width: rowWidth }}>
                <NativeRow
                    alignment="start"
                    spacing={posterTextGap}
                    style={{ width: rowWidth, paddingHorizontal: rowHorizontalPadding, paddingVertical: compact ? 10 : 12 }}
                >
                    {linkedMediaButton}
                    <RNHostView matchContents>
                        <RNView style={[styles.menuActionSlot, { width: menuActionWidth, minWidth: menuActionWidth }]}>{menu}</RNView>
                    </RNHostView>
                </NativeRow>
                <RNHostView matchContents>
                    <RNView style={[
                        styles.divider,
                        compact
                            ? { width: rowWidth - rowHorizontalPadding * 2, marginHorizontal: rowHorizontalPadding }
                            : { width: rowWidth },
                    ]} />
                </RNHostView>
            </NativeColumn>
        );
    }, [
        colors.backgroundOverlay,
        colors.textDim,
        compact,
        detailsPath,
        handleMenuAction,
        getZoomHref,
        mediaButtonWidth,
        mediaInfoWidth,
        menuActionWidth,
        onItemPress,
        posterHeight,
        posterTextGap,
        posterWidth,
        rowHorizontalPadding,
        rowWidth,
        showGenres,
        yearOnSeparateLine,
    ]);

    return (
        <SafeAreaView
            edges={safeAreaEdges.filter((edge) => edge !== 'bottom')}
            style={styles.container}
        >
            <StatusBar />
            {items === undefined && loading ? (
                <View style={styles.centeredContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading content...</Text>
                </View>
            ) : error ? (
                <View style={styles.centeredContainer}>
                    <Text style={styles.loadingText}>{error}</Text>
                    <Pressable accessibilityRole="button" onPress={() => setRetryCount((count) => count + 1)}>
                        <Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text>
                    </Pressable>
                </View>
            ) : (items ?? data).length === 0 ? (
                <View style={styles.centeredContainer}>
                    <Text style={styles.loadingText}>No titles found.</Text>
                </View>
            ) : (
                <NativeStackList
                    data={items ?? data}
                    axis="vertical"
                    nativeItems
                    keyExtractor={(item) => String(item.tmdbid)}
                    renderItem={renderItem}
                    style={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { flex: 1, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    poster: {
        width: 88,
        height: 132,
    },
    posterFrame: {
        width: 88,
        height: 132,
    },
    mediaTitle: {
        ...typography.headline,
    },
    compactMediaTitle: {
        ...typography.body,
    },
    mediaMetadata: {
        ...typography.subhead,
        fontSize: 14,
        lineHeight: 19,
    },
    compactMediaMetadata: {
        ...typography.caption,
        fontSize: 12,
        lineHeight: 17,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    menuButton: {
        width: 40,
        minWidth: 40,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuActionSlot: {
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    posterPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
    loadingText: { ...typography.body, textAlign: 'center', opacity: 0.7 },
    retryText: { fontSize: 16, fontWeight: '600', padding: 8 },
});

export default MediaGrid;
