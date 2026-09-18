import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, radii, typography } from '@/constants/theme';
import { ActionButton } from './action-button';
import { useOrders } from '@/state/order-queries';

export function Page({ title, children, subtitle }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const router = useRouter();
  return <SafeAreaView style={ui.safe}>
    <View style={ui.header}><ActionButton label="‹ BACK" variant="secondary" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><View style={{ flex: 1 }}><Text accessibilityRole="header" style={ui.title}>{title}</Text>{subtitle && <Text style={ui.muted}>{subtitle}</Text>}</View></View>
    <ModeBanner />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>{children}</ScrollView>
  </SafeAreaView>;
}
export function ModeBanner() {
  const { mode } = useOrders();
  return <View style={ui.banner}><Text style={ui.bannerText}>{mode === 'preview' ? 'PREVIEW · Sample data only. Changes reset when the app reloads.' : 'NOT CONNECTED · Live ordering is unavailable.'}</Text></View>;
}
export function Panel({ title, children }: PropsWithChildren<{ title?: string }>) {
  return <View style={ui.panel}>{title && <Text accessibilityRole="header" style={ui.section}>{title}</Text>}{children}</View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 6 }}><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={palette.inkMuted} {...props} style={[ui.input, props.multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }, props.style]} /></View>;
}
export function ErrorNotice({ message }: { message?: string | null }) {
  return message ? <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={ui.error}><Text style={ui.errorText}>{message}</Text></View> : null;
}
export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  header: { flexDirection: 'row', gap: 16, alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: palette.border },
  title: { fontFamily: typography.serif, fontWeight: '800', fontSize: 26, color: palette.ink },
  content: { padding: 16, gap: 16, width: '100%', maxWidth: 1240, alignSelf: 'center', paddingBottom: 40 },
  panel: { padding: 18, gap: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, minWidth: 0 },
  section: { color: palette.ink, fontFamily: typography.serif, fontSize: 22, fontWeight: '700' },
  body: { color: palette.ink, fontSize: 15, lineHeight: 23 },
  muted: { color: palette.inkMuted, fontSize: 13, lineHeight: 20 },
  label: { color: palette.ink, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: 12, color: palette.ink, fontSize: 16, backgroundColor: palette.canvas },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  banner: { backgroundColor: palette.amberSoft, paddingVertical: 9, paddingHorizontal: 16 },
  bannerText: { color: palette.ink, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  error: { padding: 12, backgroundColor: palette.redSoft, borderRadius: radii.sm },
  errorText: { color: palette.ink, fontSize: 14, lineHeight: 21 },
  divider: { height: 1, backgroundColor: palette.border },
});
