import React from 'react';
import { Host, RNHostView, ScrollView } from '@expo/ui';
import { ZStack } from '@expo/ui/swift-ui';
import { View } from 'react-native';
import PersonDetailsCloseButton from './person-details-close-button';
import PersonDetailsContentShared from './person-details-content.shared';
import type { PersonDetailsContentProps } from './person-details-types';
import { spacing } from './theme';

export default function PersonDetailsContentIOS(props: PersonDetailsContentProps) {
  return (
    <Host style={{ flex: 1 }}>
      <ZStack alignment="topTrailing">
        <ScrollView direction="vertical" showsIndicators={false}>
          <RNHostView matchContents={{ vertical: true }}>
            <PersonDetailsContentShared
              {...props}
              scrollingHandledByParent
              externalCloseButton
            />
          </RNHostView>
        </ScrollView>
        <RNHostView matchContents>
          <View style={{ padding: spacing.sm }}>
            <PersonDetailsCloseButton onPress={props.onClose} color={props.colors.text} />
          </View>
        </RNHostView>
      </ZStack>
    </Host>
  );
}
