import React from 'react';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export interface ExternalLinkProps extends Omit<React.ComponentProps<typeof Link>, 'href'> {
  href: string;
}

export function ExternalLink({ href, ...props }: ExternalLinkProps) {
  return (
    <Link
      target="_blank"
      {...props}
      // @ts-expect-error External URLs are not typed as Expo Router routes.
      href={href}
      onPress={(event) => {
        if (Platform.OS !== 'web') {
          event.preventDefault();
          void WebBrowser.openBrowserAsync(href);
        }
      }}
    />
  );
}
