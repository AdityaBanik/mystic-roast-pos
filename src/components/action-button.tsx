import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/theme';

type Props = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; busy?: boolean; style?: ViewStyle; accessibilityLabel?: string };

export function ActionButton({ label, onPress, variant = 'primary', disabled, busy, style, accessibilityLabel }: Props) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], (disabled || busy) && styles.disabled, pressed && !disabled && styles.pressed, style]}>
    {busy && <ActivityIndicator size="small" color={variant === 'primary' ? palette.white : palette.ink} />}
    <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  base: { minHeight: 48, minWidth: 44, paddingVertical: 10, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexDirection: 'row', gap: 8 },
  primary: { backgroundColor: palette.olive, borderColor: palette.olive },
  secondary: { backgroundColor: palette.surface, borderColor: palette.border },
  danger: { backgroundColor: palette.redSoft, borderColor: palette.redSoft },
  label: { color: palette.white, fontFamily: typography.sans, fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center', flexShrink: 1 },
  secondaryLabel: { color: palette.ink }, disabled: { opacity: 0.42 }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
