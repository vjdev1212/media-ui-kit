import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import type { ThemeColor } from './theme';

interface MenuAction {
    id: string;
    title: string;
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    iconColor?: ThemeColor;
    subtitle?: string;
    state?: 'on';
    titleColor?: ThemeColor;
}

interface WebMenuProps {
    title: string;
    actions: MenuAction[];
    onPressAction: (id: string) => void;
    onOpenMenu?: () => void;
    onCloseMenu?: () => void;
    children: React.ReactNode;
}

export const WebMenu: React.FC<WebMenuProps> = ({
    title,
    actions,
    onPressAction,
    onOpenMenu,
    onCloseMenu,
    children,
}) => {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<View | any>(null);
    const triggerRef = useRef<View | any>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const openMenu = () => {
        if (isOpen) return;
        setIsOpen(true);
        onOpenMenu?.();

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeMenu = () => {
        if (!isOpen) return;
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsOpen(false);
            onCloseMenu?.();
        });
    };

    const handleActionPress = (actionId: string) => {
        onPressAction(actionId);
        closeMenu();
    };

    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleClickOutside = (event: MouseEvent) => {
                if (
                    menuRef.current &&
                    triggerRef.current &&
                    !menuRef.current.contains(event.target as Node) &&
                    !triggerRef.current.contains(event.target as Node)
                ) {
                    closeMenu();
                }
            };

            if (isOpen) {
                document.addEventListener('click', handleClickOutside);
                return () => document.removeEventListener('click', handleClickOutside);
            }
        }
    }, [isOpen]);

    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }

    return (
        <View ref={triggerRef} style={styles.container}>
            <TouchableOpacity onPress={openMenu} activeOpacity={0.7}>
                {children}
            </TouchableOpacity>

            {isOpen && (
                <Animated.View
                    ref={menuRef}
                    style={[
                        styles.menu,
                        {
                            backgroundColor: colors.primaryCard,
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                    pointerEvents="auto"
                >
                    <View style={[styles.menuContent, { backgroundColor: colors.primaryCard }]}>
                        <View style={styles.menuHeader}>
                            <Text style={[styles.menuTitle, { color: colors.textMuted }]}>{title}</Text>
                        </View>

                        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                        {actions.map((action, index) => (
                            <View key={action.id}>
                                <TouchableOpacity
                                    style={[styles.menuItem, { backgroundColor: colors.primaryCard }]}
                                    onPress={() => handleActionPress(action.id)}
                                    activeOpacity={0.6}
                                >
                                    <View style={styles.menuItemContent}>
                                        {action.icon ? (
                                            <Ionicons
                                                name={action.icon}
                                                size={18}
                                                color={action.iconColor || action.titleColor || colors.text}
                                                style={styles.menuItemIcon}
                                            />
                                        ) : null}
                                        <Text
                                            style={[
                                                styles.menuItemTitle,
                                                { color: action.titleColor || colors.text },
                                                action.state === 'on' && styles.menuItemSelected,
                                            ]}
                                        >
                                            {action.title}
                                        </Text>
                                        {action.subtitle && (
                                            <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>{action.subtitle}</Text>
                                        )}
                                    </View>
                                    {action.state === 'on' && <View style={[styles.checkmark, { backgroundColor: colors.primary }]} />}
                                </TouchableOpacity>
                                {index < actions.length - 1 && <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />}
                            </View>
                        ))}
                    </View>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 1,
    },
    menu: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
        minWidth: 200,
        maxWidth: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 9999,
    },
    menuContent: {
    },
    menuHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    menuTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuDivider: {
        height: 1,
    },
    menuItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer' as any,
    },
    menuItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemIcon: { width: 20 },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    menuItemSelected: {
        fontWeight: '700',
    },
    menuItemSubtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    itemDivider: {
        height: 1,
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginLeft: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});