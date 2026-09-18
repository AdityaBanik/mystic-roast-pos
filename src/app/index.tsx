import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/action-button';
import { OrderCard } from '@/components/order-card';
import { ErrorNotice, ModeBanner, ui } from '@/components/ui';
import { palette } from '@/constants/theme';
import { inTab, refundDue } from '@/domain/orders';
import { useUi } from '@/state/ui-store';
import { useOrders } from '@/state/order-queries';

export default function KitchenBoard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { orders, loading, error, mode, refresh } = useOrders();
  const tab = useUi(s => s.kitchenTab);
  const setTab = useUi(s => s.setKitchenTab);
  const columns = width >= 1180 ? 3 : width >= 760 ? 2 : 1;
  const visible = orders.filter(o => inTab(o, tab)).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const refunds = orders.filter(o => refundDue(o) > 0).length;
  return <SafeAreaView style={ui.safe} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <View><Text accessibilityRole="header" style={ui.title}>Mystic Roast</Text><Text style={ui.muted}>Kitchen & orders · {mode === 'preview' ? 'Batanagar preview' : 'No branch connected'}</Text></View>
      <View style={ui.row}>
        <ActionButton label="HISTORY" variant="secondary" onPress={() => router.push('/history')} />
        <ActionButton label="SETTINGS" variant="secondary" onPress={() => router.push('/settings')} />
        <ActionButton label="＋ NEW ORDER" disabled={mode !== 'preview' || loading || !!error} onPress={() => router.push('/new-order')} />
      </View>
    </View>
    <ModeBanner />
    {!!refunds && <Pressable accessibilityRole="button" accessibilityLabel={refunds + ' orders need a refund. Open settlements.'} onPress={() => router.push({ pathname: '/history', params: { filter: 'refunds' } })} style={styles.refunds}><Text style={styles.refundText}>{refunds} {refunds === 1 ? 'order needs' : 'orders need'} a refund · Review settlements ›</Text></Pressable>}
    <View style={styles.tabs} accessibilityRole="tablist">{(['orders', 'preparing', 'ready'] as const).map(t => <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} accessibilityLabel={t + ', ' + orders.filter(o => inTab(o, t)).length + ' orders'} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.activeTab]}>
      <Text style={[styles.tabText, tab === t && { color: palette.oliveDark }]}>{t.toUpperCase()}</Text><Text style={styles.count}>{orders.filter(o => inTab(o, t)).length}</Text>
    </Pressable>)}</View>
    {error && <View style={{ padding: 16, gap: 10 }}><ErrorNotice message={error} /><ActionButton label="RETRY" variant="secondary" onPress={() => void refresh()} /></View>}
    {loading && !orders.length ? <ActivityIndicator style={{ margin: 40 }} accessibilityLabel="Loading orders" color={palette.olive} /> :
      <FlatList key={columns} data={visible} keyExtractor={o => o.id} numColumns={columns}
        refreshing={loading} onRefresh={() => void refresh()} contentContainerStyle={styles.list}
        columnWrapperStyle={columns > 1 ? { gap: 16 } : undefined}
        renderItem={({ item }) => <View style={{ width: (width - 32 - (columns - 1) * 16) / columns, marginBottom: 16 }}><OrderCard order={item} /></View>}
        ListEmptyComponent={<View style={styles.empty}><Text style={ui.section}>{mode === 'unavailable' ? 'Connect before taking orders' : 'All clear'}</Text><Text style={ui.muted}>{mode === 'unavailable' ? 'Live service setup is still required. See Settings for connection status.' : 'No ' + (tab === 'orders' ? 'new or accepted orders' : tab + ' orders') + ' right now.'}</Text></View>} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  header: { padding: 16, gap: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: palette.border, paddingHorizontal: 8 },
  tab: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: palette.olive },
  tabText: { fontSize: 12, fontWeight: '800', color: palette.inkMuted },
  count: { minWidth: 24, textAlign: 'center', padding: 5, backgroundColor: palette.oliveSoft, borderRadius: 12, color: palette.oliveDark, fontWeight: '800', fontSize: 12 },
  list: { padding: 16, flexGrow: 1 }, empty: { paddingVertical: 65, gap: 12, alignItems: 'center', paddingHorizontal: 24 },
  refunds: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: palette.redSoft },
  refundText: { color: palette.ink, fontWeight: '700', fontSize: 13 },
});
