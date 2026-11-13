import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    useWindowDimensions,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { ActivityIndicator, Text } from './Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { getYear } from './Date';
import { useTheme } from './ThemeContext';
import NativePager from './native-pager';

export interface CarouselItem {
    id: string;
    title: string;
    subtitle?: string;
    posterUrl: string;
    backdropUrl: string;
    type: 'movie' | 'series';
    year: string;
    rating: string;
    tmdbid: number;
}

export interface CarouselSource {
    apiUrl: string;
    type: 'movie' | 'series';
    minimumPopularity?: number;
}

export interface PosterCarouselProps {
    apiKey?: string;
    posterLists: CarouselSource[];
    onItemPress?: (item: CarouselItem) => void;
    autoPlay?: boolean;
    autoPlayInterval?: number;
    topInset?: number;
}

const posterImageGradient = [
    'transparent',
    'rgba(0, 0, 0, 0.12)',
    'rgba(0, 0, 0, 0.76)',
] as const;

export default function AppleTVCarousel({
    apiKey,
    posterLists,
    onItemPress,
    autoPlay = true,
    autoPlayInterval = 5000,
    topInset = 0,
}: PosterCarouselProps) {
    const { colors } = useTheme();
    const reducedMotion = useReducedMotion();
    const [activeIndex, setActiveIndex] = useState(0);
    const [data, setData] = useState<CarouselItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [carouselWidth, setCarouselWidth] = useState(0);
    const touchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
    const didSwipeRef = useRef(false);
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const autoPlayRef = useRef<any>(null);

    const responsiveDims = useMemo(() => {
        return {
            screenWidth: width,
            screenHeight: height,
            carouselHeight: width,
            titleSize: isLandscape ? 28 : 26,
            subtitleSize: isLandscape ? 14 : 14,
            contentPadding: isLandscape ? 40 : 20,
            bottomPadding: isLandscape ? 40 : 40,
        };
    }, [width, height, isLandscape]);
    const carouselHeight = responsiveDims.carouselHeight + topInset;
    const itemWidth = carouselWidth || responsiveDims.screenWidth;
    const carouselFrameStyle = {
        width: '100%' as const,
        height: carouselHeight,
        marginTop: -topInset,
    };
    const handleCarouselLayout = useCallback((event: LayoutChangeEvent) => {
        const width = event.nativeEvent.layout.width;
        setCarouselWidth((currentWidth) => currentWidth === width ? currentWidth : width);
    }, []);

    useEffect(() => {
        if (posterLists.length === 0) {
            setData([]);
            setActiveIndex(0);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const fetchCarouselData = async () => {
            try {
                setLoading(true);
                const sourceResults = await Promise.all(posterLists.map(async (source) => {
                    try {
                        const separator = source.apiUrl.includes('?') ? '&' : '?';
                        const response = await fetch(
                            `${source.apiUrl}${separator}api_key=${encodeURIComponent(apiKey ?? '')}`,
                            { signal: controller.signal },
                        );
                        if (!response.ok) throw new Error(`TMDB request failed with HTTP ${response.status}.`);
                        const payload: unknown = await response.json();
                        const results = payload && typeof payload === 'object' && 'results' in payload
                            && Array.isArray(payload.results)
                            ? payload.results
                            : [];
                        const minimumPopularity = source.minimumPopularity;
                        const filteredResults = minimumPopularity === undefined
                            ? results
                            : results.filter((item: unknown) => {
                                if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
                                const popularity = (item as Record<string, unknown>).popularity;
                                return typeof popularity === 'number' && popularity >= minimumPopularity;
                            });
                        return { type: source.type, results: filteredResults.slice(0, 5) };
                    } catch (error) {
                        if (!controller.signal.aborted) {
                            console.error(`Error fetching ${source.type} carousel source:`, error);
                        }
                        return { type: source.type, results: [] };
                    }
                }));

                if (controller.signal.aborted) return;

                const uniqueItems = new Map<string, CarouselItem>();
                sourceResults.forEach(({ type, results }) => {
                    results.forEach((item) => {
                        if (!item || typeof item !== 'object') return;
                        const media = item as Record<string, unknown>;
                        const title = typeof media.title === 'string'
                            ? media.title
                            : typeof media.name === 'string'
                                ? media.name
                                : undefined;
                        if (
                            typeof media.id !== 'number'
                            || typeof media.poster_path !== 'string'
                            || !media.poster_path
                            || typeof media.backdrop_path !== 'string'
                            || !media.backdrop_path
                            || !title
                        ) return;

                        const releaseDate = typeof media.release_date === 'string'
                            ? media.release_date
                            : typeof media.first_air_date === 'string'
                                ? media.first_air_date
                                : '';
                        const carouselItem: CarouselItem = {
                            id: `${type}-${media.id}`,
                            title,
                            subtitle: typeof media.overview === 'string' ? media.overview : undefined,
                            posterUrl: `https://image.tmdb.org/t/p/w780${media.poster_path}`,
                            backdropUrl: `https://image.tmdb.org/t/p/w1280${media.backdrop_path}`,
                            type,
                            year: getYear(releaseDate),
                            rating: typeof media.vote_average === 'number' ? media.vote_average.toFixed(1) : '0.0',
                            tmdbid: media.id,
                        };
                        uniqueItems.set(carouselItem.id, carouselItem);
                    });
                });

                setData([...uniqueItems.values()].sort(() => 0.5 - Math.random()).slice(0, 6));
                setActiveIndex(0);
            } catch (error) {
                if (!controller.signal.aborted) console.error('Error fetching carousel data:', error);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        void fetchCarouselData();
        return () => controller.abort();
    }, [apiKey, posterLists]);

    useEffect(() => {
        if (autoPlay && data.length > 1) {
            autoPlayRef.current = setInterval(() => {
                setActiveIndex((prevIndex) => {
                    return (prevIndex + 1) % data.length;
                });
            }, autoPlayInterval);
        }
        return () => {
            if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
        };
    }, [autoPlay, autoPlayInterval, data.length]);

    const handleIndexChange = useCallback((index: number) => {
        if (index !== activeIndex && index >= 0 && index < data.length) setActiveIndex(index);
    }, [activeIndex, data.length]);

    const handleItemPress = useCallback((item: CarouselItem) => {
        if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
        onItemPress?.(item);
    }, [onItemPress]);

    const scrollToIndex = useCallback((index: number) => {
        if (index >= 0 && index < data.length) {
            setActiveIndex(index);
            if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
        }
    }, [data.length]);

    const renderPaginationDot = useCallback((index: number) => (
        <Pressable
            key={`dot-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${index + 1}`}
            accessibilityState={{ selected: activeIndex === index }}
            hitSlop={8}
            style={[
                styles.paginationDot,
                { backgroundColor: 'rgba(255, 255, 255, 0.68)' },
                activeIndex === index && { backgroundColor: '#FFFFFF', width: 12 },
            ]}
            onPress={() => scrollToIndex(index)}
        />
    ), [activeIndex, scrollToIndex]);

    const renderCarouselItem = useCallback((item: CarouselItem, index: number) => {
        const dims = responsiveDims;
        return (
            <View style={[styles.carouselItem, { width: itemWidth, height: dims.carouselHeight + topInset }]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                    style={styles.carouselTouchable}
                    onTouchStart={(event) => {
                        touchStartRef.current = {
                            pageX: event.nativeEvent.pageX,
                            pageY: event.nativeEvent.pageY,
                        };
                        didSwipeRef.current = false;
                    }}
                    onTouchMove={(event) => {
                        const start = touchStartRef.current;
                        if (!start) return;

                        const { pageX, pageY } = event.nativeEvent;
                        if (Math.abs(pageX - start.pageX) > 10 || Math.abs(pageY - start.pageY) > 10) {
                            didSwipeRef.current = true;
                        }
                    }}
                    onPress={() => {
                        if (!didSwipeRef.current) handleItemPress(item);
                    }}
                >
                    <View style={styles.backdropImage}>
                        {(Math.abs(activeIndex - index) <= 1 || Math.abs(activeIndex - index) >= data.length - 1) && (
                            <Animated.Image
                                key={`${item.id}-${index}`}
                                source={{ uri: item.backdropUrl || item.posterUrl }}
                                resizeMethod="resize"
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        opacity: activeIndex === index ? 1 : 0,
                                        transform: [{ scale: activeIndex === index || reducedMotion ? 1 : 1.04 }],
                                        transitionProperty: ['opacity', 'transform'],
                                        transitionDuration: reducedMotion ? '120ms' : '260ms',
                                        transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
                                    },
                                ]}
                                resizeMode="cover"
                            />
                        )}
                        <LinearGradient
                            colors={posterImageGradient}
                            locations={[0, 0.58, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.gradient}
                        />
                        <Animated.View
                            style={[
                                styles.contentContainer,
                                {
                                    paddingHorizontal: dims.contentPadding,
                                    paddingBottom: dims.bottomPadding,
                                    flexDirection: 'row',
                                    width: '100%',
                                    opacity: activeIndex === index ? 1 : 0,
                                    transitionProperty: 'opacity',
                                    transitionDuration: reducedMotion ? '120ms' : '180ms',
                                    transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
                                },
                            ]}
                        >
                            <View style={[styles.textContainer, { flex: 1 }]}>
                                <Text style={[styles.title, { fontSize: dims.titleSize, color: '#FFFFFF' }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                {item.subtitle && (
                                    <Text style={[styles.subtitle, { fontSize: dims.subtitleSize, color: '#FFFFFF' }]} numberOfLines={2}>
                                        {item.subtitle}
                                    </Text>
                                )}
                                <View style={styles.metaContainer}>
                                    <Text style={[styles.metaText, { fontSize: isLandscape ? 12 : 14, color: '#FFFFFF' }]} numberOfLines={1}>
                                        ★ {item.rating}   {item.year}
                                    </Text>
                                    {data.length > 1 && (
                                        <View pointerEvents="box-none" style={styles.paginationPosition}>
                                            <BlurView intensity={20} tint="dark" style={styles.paginationBlur}>
                                                <View style={styles.paginationDots}>
                                                    {data.map((_, dotIndex) => renderPaginationDot(dotIndex))}
                                                </View>
                                            </BlurView>
                                        </View>
                                    )}
                                    <View style={styles.typeIndicator}>
                                        <Text style={[styles.typeText, { fontSize: isLandscape ? 10 : 12, color: '#FFFFFF' }]}>
                                            {item.type === 'movie' ? 'MOVIE' : 'SERIES'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </View>
                </Pressable>
            </View>
        );
    }, [activeIndex, data, isLandscape, handleItemPress, itemWidth, reducedMotion, renderPaginationDot, responsiveDims, topInset]);

    if (loading) {
        return (
            <View
                onLayout={handleCarouselLayout}
                style={[styles.container, styles.loadingContainer, carouselFrameStyle, { backgroundColor: colors.backgroundOverlay }]}
            >
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!data.length) return null;

    return (
        <View
            onLayout={handleCarouselLayout}
            style={[styles.container, carouselFrameStyle, { backgroundColor: colors.backgroundOverlay }]}
        >
            <NativePager
                data={data}
                renderPage={renderCarouselItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                activeIndex={activeIndex}
                onIndexChange={handleIndexChange}
                style={{ width: itemWidth, height: carouselHeight }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { position: 'relative' },
    carouselItem: { marginBottom: 10 },
    carouselTouchable: { flex: 1 },
    backdropImage: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
    gradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    contentContainer: { alignItems: 'flex-end', zIndex: 1 },
    textContainer: { justifyContent: 'flex-end', paddingBottom: 10 },
    title: { fontWeight: '700', marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    subtitle: { lineHeight: 22, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, maxWidth: 600 },
    metaContainer: { position: 'relative', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    metaText: { fontWeight: '500' },
    typeIndicator: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.72)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
    typeText: { fontWeight: '600', letterSpacing: 1 },
    loadingContainer: { justifyContent: 'center', alignItems: 'center' },
    paginationBlur: {
        borderRadius: 20,
        overflow: 'hidden',
        paddingHorizontal: 6,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.38)',
    },
    paginationPosition: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    paginationDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    paginationDot: { width: 6, height: 6, borderRadius: 3 },
});
