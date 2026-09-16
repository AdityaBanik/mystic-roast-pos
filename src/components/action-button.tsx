import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/theme';

type Props = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; style?: ViewStyle };

export function ActionButton({ label, onPress, variant = 'primary', disabled, style }: Props) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}>
    <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  base: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  primary: { backgroundColor: palette.olive, borderColor: palette.olive },
  secondary: { backgroundColor: palette.surface, borderColor: palette.border },
  danger: { backgroundColor: palette.redSoft, borderColor: palette.redSoft },
  label: { color: palette.white, fontFamily: typography.sans, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  secondaryLabel: { color: palette.ink }, disabled: { opacity: 0.42 }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
