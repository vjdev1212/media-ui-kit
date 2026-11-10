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

export interface PosterCarouselProps {
    apiKey?: string;
    filter?: 'all' | 'movies' | 'series';
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
    filter = 'all',
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
            carouselHeight: isLandscape ? height * 0.9 : height * 0.5,
            posterWidth: isLandscape ? 180 : 120,
            posterHeight: isLandscape ? 270 : 120,
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
        const fetchCarouselData = async () => {
            try {
                setLoading(true);
                const promises: Promise<any>[] = [];

                if (filter === 'all' || filter === 'movies') {
                    promises.push(fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey ?? ''}`).then(r => r.json()));
                }
                if (filter === 'all' || filter === 'series') {
                    promises.push(fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${apiKey ?? ''}`).then(r => r.json()));
                }

                const results = await Promise.all(promises);
                const allItems: any[] = [];

                results.forEach((result, index) => {
                    let type: 'movie' | 'series';
                    if (filter === 'movies') type = 'movie';
                    else if (filter === 'series') type = 'series';
                    else type = index === 0 ? 'movie' : 'series';

                    const items = result?.results?.slice(0, 5) || [];
                    items.forEach((item: any) => {
                        if (item.poster_path && item.backdrop_path) {
                            allItems.push({
                                id: `${type}-${item.id}`,
                                title: item.title || item.name,
                                subtitle: item.overview,
                                posterUrl: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
                                backdropUrl: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
                                type,
                                year: getYear(item.release_date || item.first_air_date),
                                rating: item.vote_average?.toFixed(1) || '0.0',
                                tmdbid: item.id,
                            });
                        }
                    });
                });

                const shuffled = allItems.sort(() => 0.5 - Math.random()).slice(0, 6);
                setData(shuffled);
            } catch (error) {
                console.error('Error fetching carousel data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCarouselData();
    }, [apiKey, filter]);

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

    if (loading || !data.length) {
        return (
            <View
                onLayout={handleCarouselLayout}
                style={[styles.container, styles.loadingContainer, carouselFrameStyle, { backgroundColor: colors.backgroundOverlay }]}
            >
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

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
