import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    useWindowDimensions,
    View as RNView,
} from 'react-native';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StatusBar, Text, View } from './Themed';
import { WebMenu } from './WebMenuView';
import PosterArtwork from './PosterArtwork';
import { getYear } from './Date';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { spacing, typography } from './theme';

export interface MediaGridProps {
    apiUrl?: string;
    sources?: MediaGridSource[];
    apiKey?: string;
    mediaType: 'movie' | 'series' | 'any';
    minimumPopularity?: number;
    items?: MediaGridItem[];
    compact?: boolean;
    showGenres?: boolean;
    yearOnSeparateLine?: boolean;
    safeAreaEdges?: Edge[];
    onItemPress: (item: MediaGridItem) => void;
    onAddToWatchlist?: (item: MediaGridItem) => Promise<boolean>;
    onActionError?: (title: string, message: string) => void;
}

export interface MediaGridSource {
    apiUrl: string;
    mediaType: 'movie' | 'series';
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
    sortValue?: string | number;
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

const ROW_HORIZONTAL_PADDING = 16;
const POSTER_WIDTH = 88;
const POSTER_TEXT_GAP = 16;
const MENU_ACTION_WIDTH = 56;

interface GridPosterProps {
    poster?: string;
    width: number;
    height: number;
    compact: boolean;
}

const GridPoster = React.memo(function GridPoster({
    poster,
    width,
    height,
    compact,
}: GridPosterProps) {
    const { colors } = useTheme();
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
        <PosterArtwork style={[styles.posterFrame, { width, height }]}>
            {(onImageLoad) => (
                <>
                    {poster && !hasError ? (
                        <Image
                            key={poster}
                            source={{ uri: poster }}
                            onLoadStart={() => setIsLoaded(false)}
                            onLoad={() => {
                                setIsLoaded(true);
                                onImageLoad();
                            }}
                            onError={() => setHasError(true)}
                            resizeMethod="resize"
                            fadeDuration={0}
                            style={[
                                styles.poster,
                                { width, height, backgroundColor: colors.backgroundOverlay },
                            ]}
                            resizeMode="cover"
                        />
                    ) : null}
                    {(!isLoaded || hasError || !poster) && (
                        <RNView
                            pointerEvents="none"
                            style={[
                                StyleSheet.absoluteFill,
                                styles.posterPlaceholder,
                                { backgroundColor: colors.backgroundOverlay },
                            ]}
                        >
                            <Ionicons
                                name="film-outline"
                                size={compact ? 20 : 30}
                                color={colors.textDim}
                            />
                        </RNView>
                    )}
                </>
            )}
        </PosterArtwork>
    );
});

interface MediaPage {
    items: MediaGridItem[];
    page: number;
    totalPages: number;
}

async function fetchMediaPage(
    apiUrl: string,
    apiKey: string | undefined,
    mediaType: MediaGridSource['mediaType'],
    page: number,
    signal: AbortSignal,
    minimumPopularity?: number,
): Promise<MediaPage> {
    if (!apiKey) throw new Error('TMDB API key is not configured.');

    const url = new URL(apiUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('api_key', apiKey);

    const response = await fetch(url.toString(), { signal });
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !('results' in payload) || !Array.isArray(payload.results)) {
        throw new Error('TMDB returned an invalid media list.');
    }

    const pageValue = 'page' in payload ? payload.page : undefined;
    const totalPagesValue = 'total_pages' in payload ? payload.total_pages : undefined;
    const currentPage = typeof pageValue === 'number' && Number.isInteger(pageValue) && pageValue > 0
        ? pageValue
        : page;
    const totalPages = typeof totalPagesValue === 'number'
        && Number.isInteger(totalPagesValue)
        && totalPagesValue >= currentPage
        ? totalPagesValue
        : currentPage;
    const sortField = url.searchParams.get('sort_by')?.split('.')[0] ?? 'popularity';
    const items = payload.results.flatMap((value): MediaGridItem[] => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
        const item = value as Record<string, unknown>;
        if (typeof item.id !== 'number' || typeof item.poster_path !== 'string' || typeof item.backdrop_path !== 'string') {
            return [];
        }
        if (
            minimumPopularity !== undefined
            && (typeof item.popularity !== 'number' || item.popularity < minimumPopularity)
        ) return [];

        const releaseDate = typeof item.release_date === 'string'
            ? item.release_date
            : typeof item.first_air_date === 'string' ? item.first_air_date : '';
        const voteAverage = typeof item.vote_average === 'number' ? item.vote_average : undefined;
        const genres = Array.isArray(item.genre_ids)
            ? item.genre_ids.flatMap((genreId) => (
                typeof genreId === 'number' && GENRE_NAMES[genreId] ? [GENRE_NAMES[genreId]] : []
            ))
            : [];
        const sortValue = sortField === 'release_date'
            || sortField === 'primary_release_date'
            || sortField === 'first_air_date'
            ? releaseDate
            : sortField === 'title' || sortField === 'name'
                ? (typeof item.title === 'string' ? item.title : item.name)
                : sortField === 'original_title' || sortField === 'original_name'
                    ? (typeof item.original_title === 'string' ? item.original_title : item.original_name)
                    : item[sortField];

        return [{
            tmdbid: item.id,
            name: typeof item.title === 'string' ? item.title : typeof item.name === 'string' ? item.name : '',
            year: getYear(releaseDate),
            poster: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
            background: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
            imdbRating: voteAverage?.toFixed(1),
            imdbid: typeof item.imdb_id === 'string' ? item.imdb_id : undefined,
            type: mediaType,
            genres,
            popularity: typeof item.popularity === 'number' ? item.popularity : undefined,
            sortValue: typeof sortValue === 'string' || typeof sortValue === 'number' ? sortValue : undefined,
        }];
    });

    return { items, page: currentPage, totalPages };
}

async function fetchMediaSourcesPage(
    sources: MediaGridSource[],
    apiKey: string | undefined,
    page: number,
    signal: AbortSignal,
    minimumPopularity?: number,
): Promise<MediaPage> {
    const pages = await Promise.all(sources.map((source) => (
        fetchMediaPage(source.apiUrl, apiKey, source.mediaType, page, signal, minimumPopularity)
    )));
    const sortBy = new URL(sources[0].apiUrl).searchParams.get('sort_by') ?? 'popularity.desc';
    const descending = sortBy.endsWith('.desc');
    const items = pages.flatMap((result) => result.items);
    items.sort((left, right) => {
        if (left.sortValue === undefined) return 1;
        if (right.sortValue === undefined) return -1;
        const comparison = typeof left.sortValue === 'number' && typeof right.sortValue === 'number'
            ? left.sortValue - right.sortValue
            : String(left.sortValue).localeCompare(String(right.sortValue));
        return descending ? -comparison : comparison;
    });
    return {
        items,
        page: Math.min(...pages.map((result) => result.page)),
        totalPages: Math.max(...pages.map((result) => result.totalPages)),
    };
}

const MediaGrid: React.FC<MediaGridProps> = ({
    apiUrl,
    sources,
    apiKey,
    mediaType,
    minimumPopularity,
    items,
    compact = false,
    showGenres = true,
    yearOnSeparateLine = false,
    safeAreaEdges = ['left', 'right', 'bottom'],
    onItemPress,
    onAddToWatchlist,
    onActionError,
}) => {
    const { colors, colorScheme } = useTheme();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [data, setData] = useState<MediaGridItem[]>([]);
    const [loading, setLoading] = useState(items === undefined && Boolean(apiUrl));
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [emptyFilteredPage, setEmptyFilteredPage] = useState(false);
    const requestIdRef = useRef(0);
    const nextPageRef = useRef(2);
    const totalPagesRef = useRef(1);
    const loadingMoreRef = useRef(false);
    const loadMoreControllerRef = useRef<AbortController | null>(null);
    const activeSources = useMemo(
        () => sources ?? (
            apiUrl && mediaType !== 'any'
                ? [{ apiUrl, mediaType }]
                : []
        ),
        [apiUrl, mediaType, sources],
    );
    const rowWidth = Math.max(0, width - insets.left - insets.right);
    const posterWidth = compact ? 64 : POSTER_WIDTH;
    const posterHeight = compact ? 96 : 132;
    const posterTextGap = compact ? 12 : POSTER_TEXT_GAP;
    const rowHorizontalPadding = compact ? 24 : ROW_HORIZONTAL_PADDING;
    const menuActionWidth = compact ? 40 : MENU_ACTION_WIDTH;
    const mediaButtonWidth = Math.max(
        0,
        rowWidth - rowHorizontalPadding * 2 - menuActionWidth - posterTextGap,
    );
    const mediaInfoWidth = Math.max(
        0,
        mediaButtonWidth - posterWidth - posterTextGap,
    );

    useEffect(() => {
        const requestId = ++requestIdRef.current;
        loadMoreControllerRef.current?.abort();
        loadMoreControllerRef.current = null;
        loadingMoreRef.current = false;
        nextPageRef.current = 2;
        totalPagesRef.current = 1;
        setPage(1);
        setTotalPages(1);
        setLoadingMore(false);
        setLoadMoreError(null);
        setEmptyFilteredPage(false);

        if (items !== undefined) {
            setData(items);
            setLoading(false);
            setError(null);
            return;
        }
        if (activeSources.length === 0) {
            setData([]);
            setLoading(false);
            setError(null);
            return;
        }

        const controller = new AbortController();
        setData([]);
        setLoading(true);
        setError(null);
        void fetchMediaSourcesPage(activeSources, apiKey, 1, controller.signal, minimumPopularity)
            .then((result) => {
                if (controller.signal.aborted || requestId !== requestIdRef.current) return;
                setData(result.items);
                setPage(result.page);
                setTotalPages(result.totalPages);
                nextPageRef.current = result.page + 1;
                totalPagesRef.current = result.totalPages;
            })
            .catch((fetchError: unknown) => {
                if (controller.signal.aborted || requestId !== requestIdRef.current) return;
                setError(fetchError instanceof Error ? fetchError.message : 'Unable to load titles.');
            })
            .finally(() => {
                if (!controller.signal.aborted && requestId === requestIdRef.current) {
                    setLoading(false);
                }
            });

        return () => {
            controller.abort();
            loadMoreControllerRef.current?.abort();
            loadMoreControllerRef.current = null;
            loadingMoreRef.current = false;
            if (requestIdRef.current === requestId) requestIdRef.current += 1;
        };
    }, [activeSources, apiKey, apiUrl, items, mediaType, minimumPopularity, retryCount]);

    const loadMore = useCallback(async (isRetry = false) => {
        if (
            items !== undefined
            || activeSources.length === 0
            || loading
            || loadingMoreRef.current
            || (!isRetry && loadMoreError)
        ) return;

        const nextPage = nextPageRef.current;
        if (nextPage > totalPagesRef.current) return;

        const requestId = requestIdRef.current;
        const controller = new AbortController();
        loadMoreControllerRef.current = controller;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        setLoadMoreError(null);
        setEmptyFilteredPage(false);

        try {
            const result = await fetchMediaSourcesPage(
                activeSources,
                apiKey,
                nextPage,
                controller.signal,
                minimumPopularity,
            );
            if (controller.signal.aborted || requestId !== requestIdRef.current) return;

            setData((currentData) => {
                const knownIds = new Set(currentData.map((item) => item.tmdbid));
                const newItems = result.items.filter((item) => !knownIds.has(item.tmdbid));
                return [...currentData, ...newItems];
            });
            setPage(result.page);
            setTotalPages(result.totalPages);
            nextPageRef.current = result.page + 1;
            totalPagesRef.current = result.totalPages;
            setEmptyFilteredPage(
                minimumPopularity !== undefined
                && result.items.length === 0
                && result.page < result.totalPages,
            );
        } catch (fetchError) {
            if (!controller.signal.aborted && requestId === requestIdRef.current) {
                setLoadMoreError(fetchError instanceof Error ? fetchError.message : 'Unable to load more titles.');
            }
        } finally {
            if (requestId === requestIdRef.current) {
                loadingMoreRef.current = false;
                setLoadingMore(false);
                if (loadMoreControllerRef.current === controller) loadMoreControllerRef.current = null;
            }
        }
    }, [activeSources, apiKey, items, loadMoreError, loading, mediaType, minimumPopularity]);

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
            const type = (item.type ?? mediaType) === 'movie'
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
    }, [mediaType, onActionError, onAddToWatchlist, onItemPress]);

    const renderItem = useCallback((item: MediaGridItem) => {
        const itemType = (item.type ?? mediaType) === 'movie'
            ? 'Movie'
            : 'TV Show';
        const allMenuActions: MenuAction[] = [
            { id: 'open', title: 'View', image: 'arrow.up.right' },
            { id: 'watchlist', title: 'Add to Watchlist', image: 'bookmark' },
            { id: 'share', title: 'Share', image: 'square.and.arrow.up' },
        ];
        const menuActions = onAddToWatchlist
            ? allMenuActions
            : allMenuActions.filter(({ id }) => id !== 'watchlist');
        const webMenuActions = menuActions.map(({ id, title }) => ({ id: id ?? title, title }));
        const year = item.year?.split('–')[0];
        const metadata = yearOnSeparateLine
            ? itemType
            : [itemType, year].filter(Boolean).join(' · ');
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
                colorScheme={colorScheme}
                onPressAction={({ nativeEvent }) => void handleMenuAction(nativeEvent.event, item)}
            >
                {menuButton}
            </MenuView>
        );

        const mediaButton = (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}`}
                onPress={() => onItemPress(item)}
                style={[
                    styles.mediaButton,
                    { width: mediaButtonWidth, gap: posterTextGap },
                ]}
            >
                <GridPoster
                    key={`${item.tmdbid}:${item.poster}`}
                    poster={item.poster}
                    width={posterWidth}
                    height={posterHeight}
                    compact={compact}
                />
                <RNView style={{ width: mediaInfoWidth, paddingTop: spacing.xs, gap: compact ? 3 : 7 }}>
                    <Text style={compact ? styles.compactMediaTitle : styles.mediaTitle}>
                        {item.name}
                    </Text>
                    {metadata && (
                        <Text style={compact ? styles.compactMediaMetadata : styles.mediaMetadata}>
                            {metadata}
                        </Text>
                    )}
                    {yearOnSeparateLine && year && (
                        <Text style={compact ? styles.compactMediaMetadata : styles.mediaMetadata}>
                            {year}
                        </Text>
                    )}
                    {secondaryMetadata && (
                        <Text style={compact ? styles.compactMediaMetadata : styles.mediaMetadata}>
                            {secondaryMetadata}
                        </Text>
                    )}
                </RNView>
            </Pressable>
        );
        return (
            <RNView style={{ width: rowWidth }}>
                <RNView style={[
                    styles.row,
                    { width: rowWidth, paddingHorizontal: rowHorizontalPadding, paddingVertical: compact ? 10 : 12, gap: posterTextGap },
                ]}>
                    {mediaButton}
                    <RNView style={[styles.menuActionSlot, { width: menuActionWidth, minWidth: menuActionWidth }]}>{menu}</RNView>
                </RNView>
                <RNView style={[
                    styles.divider,
                    { backgroundColor: colors.border },
                    compact
                        ? { width: rowWidth - rowHorizontalPadding * 2, marginHorizontal: rowHorizontalPadding }
                        : { width: rowWidth },
                ]} />
            </RNView>
        );
    }, [
        colors.backgroundOverlay,
        colors.border,
        colors.textDim,
        compact,
        mediaType,
        handleMenuAction,
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
        onAddToWatchlist,
    ]);

    const listFooter = loadingMore ? (
        <View style={styles.listFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading more...</Text>
        </View>
    ) : loadMoreError ? (
        <View style={[styles.listFooter, styles.listFooterError]}>
            <Text style={styles.loadingText}>{loadMoreError}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadMore(true)}>
                <Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text>
            </Pressable>
        </View>
    ) : emptyFilteredPage ? (
        <View style={[styles.listFooter, styles.listFooterError]}>
            <Text style={styles.loadingText}>No titles on this page meet the popularity threshold.</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadMore()}>
                <Text style={[styles.retryText, { color: colors.primary }]}>Load more titles</Text>
            </Pressable>
        </View>
    ) : items === undefined && activeSources.length > 0 && data.length > 0 && page >= totalPages ? (
        <View accessible accessibilityRole="text" style={styles.listFooter}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.loadingText}>That's all</Text>
        </View>
    ) : null;

    const listEmptyComponent = minimumPopularity === undefined ? undefined : (
        <View style={styles.centeredContainer}>
            <Text style={styles.loadingText}>
                {page >= totalPages
                    ? `No titles with popularity >= ${minimumPopularity} found.`
                    : 'No matching titles on this page.'}
            </Text>
            {page < totalPages && (
                <Pressable
                    accessibilityRole="button"
                    disabled={loadingMore}
                    onPress={() => void loadMore()}
                >
                    <Text style={[styles.retryText, { color: colors.primary }]}>
                        {loadingMore ? 'Loading more...' : 'Load more titles'}
                    </Text>
                </Pressable>
            )}
        </View>
    );

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
            ) : (items ?? data).length === 0 && minimumPopularity === undefined ? (
                <View style={styles.centeredContainer}>
                    <Text style={styles.loadingText}>No titles found.</Text>
                </View>
            ) : (
                <FlatList<MediaGridItem>
                    data={items ?? data}
                    keyExtractor={(item) => String(item.tmdbid)}
                    renderItem={({ item }) => renderItem(item)}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={listEmptyComponent}
                    ListFooterComponent={listFooter ?? undefined}
                    onEndReached={items === undefined && activeSources.length > 0 ? () => void loadMore() : undefined}
                    onEndReachedThreshold={0.5}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { flex: 1 },
    listContent: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
    listFooter: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    listFooterError: {
        flexDirection: 'column',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
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
