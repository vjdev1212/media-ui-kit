import React from 'react';
import { BottomSheet, Host } from '@expo/ui';
import type { ColorValue } from 'react-native';

interface PersonDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  backgroundColor: ColorValue;
  children: React.ReactElement;
}

export default function PersonDetailsSheet({
  visible,
  onClose,
  backgroundColor,
  children,
}: PersonDetailsSheetProps) {
  return (
    <Host>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={['full']}
        contentPadding={0}
        containerColor={backgroundColor}
      >
        {children}
      </BottomSheet>
    </Host>
  );
}
