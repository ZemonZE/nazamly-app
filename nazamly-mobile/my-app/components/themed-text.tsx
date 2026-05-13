import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useAppTheme } from '@/constants/theme';

type ThemedTextProps = TextProps & {
  type?: 'default' | 'defaultSemiBold' | 'subtitle' | 'link' | 'title';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  const { colors } = useAppTheme();

  const typeStyles = {
    default: { color: colors.textPrimary },
    defaultSemiBold: { color: colors.textPrimary, fontWeight: '600' as const },
    subtitle: { color: colors.textSecondary, fontSize: 14 },
    link: { color: colors.indigo || '#3F51B5' },
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' as const },
  };

  return <Text style={[typeStyles[type], style]} {...rest} />;
}