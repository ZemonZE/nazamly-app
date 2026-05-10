import React from 'react';
import { View, ViewProps } from 'react-native';
import { useAppTheme } from '@/constants/theme';

export function ThemedView({ style, ...rest }: ViewProps) {
  const { colors } = useAppTheme();
  return <View style={[{ backgroundColor: colors.bg }, style]} {...rest} />;
}