import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { OrderCard } from '@/components/order-card';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { KitchenTab } from '@/domain/orders';
import { useOrderStore } from '@/state/order-store';

const tabLabels: { key: KitchenTab; label: string }[] = [
  { key: 'orders', label: 'ORDERS' }, { key: 'preparing', label: 'PREPARING' }, { key: 'ready', label: 'READY' },
];

export default function KitchenBoard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { orders } = useOrderStore();
  const [tab, setTab] = useState<KitchenTab>('orders');
  const columns = width >= 1180 ? 3 : width >= 720 ? 2 : 1;
  const counts = useMemo(() => ({
    orders: orders.filter((order) => order.status === 'received' || order.status === 'accepted').length,
    preparing: orders.filter((order) => order.status === 'preparing').length,
    ready: orders.filter((order) => order.status === 'ready').length,
  }), [orders]);
  const visibleOrders = orders
    .filter((order) => tab === 'orders' ? order.status === 'received' || order.status === 'accepted' : order.status === tab)
    .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <View style={styles.brandRow}><View style={styles.owlMark}><Text style={styles.owl}>◉</Text></View><View><Text style={styles.brand}>Mystic Roast</Text><Text style={styles.subtitle}>KITCHEN & ORDERS</Text></View></View>
      <View style={styles.headerActions}><View style={styles.online}><View style={styles.onlineDot} /><Text style={styles.onlineText}>ONLINE</Text></View><ActionButton label="＋ NEW ORDER" onPress={() => router.push('/new-order')} /></View>
    </View>
    <View style={styles.tabs}>{tabLabels.map((item) => {
      const active = item.key === tab;
      return <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, active && styles.activeTab]}>
        <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{item.label}</Text>
        <View style={[styles.count, active && styles.activeCount]}><Text style={[styles.countText, active && styles.activeCountText]}>{counts[item.key]}</Text></View>
      </Pressable>;
    })}</View>
    <FlatList
      key={columns}
      data={visibleOrders}
      keyExtractor={(order) => order.id}
      numColumns={columns}
      contentContainerStyle={styles.list}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      renderItem={({ item }) => <View style={styles.cardSlot}><OrderCard order={item} /></View>}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>All clear</Text><Text style={styles.emptyText}>No {tab === 'orders' ? 'new orders' : tab} right now.</Text></View>}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: palette.border },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, owlMark: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.olive, alignItems: 'center', justifyContent: 'center' }, owl: { color: palette.canvas, fontSize: 24, fontWeight: '900' },
  brand: { fontFamily: typography.serif, color: palette.ink, fontSize: 24, fontWeight: '800' }, subtitle: { fontFamily: typography.sans, color: palette.inkMuted, fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, online: { flexDirection: 'row', alignItems: 'center', gap: 6 }, onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.green }, onlineText: { color: palette.green, fontFamily: typography.sans, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: palette.border }, tab: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, borderBottomWidth: 3, borderBottomColor: 'transparent' }, activeTab: { borderBottomColor: palette.olive },
  tabLabel: { color: palette.inkMuted, fontFamily: typography.sans, fontWeight: '800', fontSize: 13, letterSpacing: 1.1 }, activeTabLabel: { color: palette.oliveDark }, count: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: radii.pill, backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, activeCount: { backgroundColor: palette.olive }, countText: { color: palette.inkMuted, fontSize: 11, fontWeight: '800' }, activeCountText: { color: palette.white },
  list: { padding: spacing.xl, flexGrow: 1 }, row: { gap: spacing.lg }, cardSlot: { flex: 1, marginBottom: spacing.lg, minWidth: 0 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }, emptyTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 30, fontWeight: '800' }, emptyText: { color: palette.inkMuted, fontFamily: typography.sans, fontSize: 15, marginTop: spacing.sm },
});
