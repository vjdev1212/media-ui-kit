import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const edgeColors = ['rgba(0, 0, 0, 0.3)', 'transparent', 'rgba(0, 0, 0, 0.3)'] as const;
const edgeLocations = [0, 0.5, 1] as const;

export default function PosterVignette() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={edgeColors}
        locations={edgeLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={edgeColors}
        locations={edgeLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
