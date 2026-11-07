import { View } from 'react-native';

interface BottomSpacingProps {
  space?: number;
}

export default function BottomSpacing({ space = 50 }: BottomSpacingProps) {
  return <View style={{ height: space }} />;
}
