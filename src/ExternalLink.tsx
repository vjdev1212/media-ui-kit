import React from 'react';
import { Linking, Platform, Pressable, type PressableProps } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export interface ExternalLinkProps extends Omit<PressableProps, 'onPress'> {
  href: string;
  onPress?: PressableProps['onPress'];
}

export function ExternalLink({ href, onPress, ...props }: ExternalLinkProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      onPress={(event) => {
        onPress?.(event);
        if (event.defaultPrevented) return;

        const openLink = Platform.OS === 'web'
          ? Linking.openURL(href)
          : WebBrowser.openBrowserAsync(href);
        void openLink.catch((error: unknown) => {
          console.error('Failed to open external link:', error);
        });
      }}
    />
  );
}
