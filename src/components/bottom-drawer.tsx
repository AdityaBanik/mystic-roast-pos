import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/constants/theme';
import { ActionButton } from './action-button';
import { ui } from './ui';

export function BottomDrawer({ visible, title, subtitle, onClose, footer, children, busy = false }: PropsWithChildren<{
  visible: boolean; title: string; subtitle?: string; onClose: () => void; footer?: ReactNode; busy?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close drawer" disabled={busy} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { maxHeight: height - Math.max(insets.top, 20) - 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 3 }}><Text accessibilityRole="header" style={ui.section}>{title}</Text>{subtitle && <Text style={ui.muted}>{subtitle}</Text>}</View>
          <ActionButton label="CLOSE" variant="secondary" onPress={onClose} disabled={busy} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>{children}</ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#20181088', justifyContent: 'flex-end' },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, width: '100%', maxWidth: 760, alignSelf: 'center', overflow: 'hidden', flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderColor: palette.border },
  content: { padding: 20, gap: 18 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: 1, borderColor: palette.border },
});
