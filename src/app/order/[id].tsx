import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { PaymentPill } from '@/components/payment-pill';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { formatMoney, fulfilmentLabel, sourceLabel } from '@/domain/orders';
import { useOrderStore } from '@/state/order-store';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { orders, recordPayment, acceptOrder, startPreparing, markReady, completeOrder } = useOrderStore();
  const order = orders.find((candidate) => candidate.id === id);
  if (!order) return <SafeAreaView style={styles.safe}><Text style={styles.title}>Order not found</Text></SafeAreaView>;

  const advance = () => {
    if (order.status === 'received') acceptOrder(order.id);
    else if (order.status === 'accepted') startPreparing(order.id);
    else if (order.status === 'preparing') markReady(order.id);
    else if (order.status === 'ready' && !completeOrder(order.id)) Alert.alert('Payment due', 'Record payment before completing the order.');
    else router.back();
  };
  const labels = { received: 'ACCEPT ORDER', accepted: 'START PREPARING', preparing: 'MARK READY', ready: 'COMPLETE ORDER', completed: 'DONE', cancelled: 'CANCELLED' };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><ActionButton label="‹ BACK" variant="secondary" onPress={() => router.back()} /><View style={styles.headerTitle}><Text style={styles.eyebrow}>ORDER DETAIL</Text><Text style={styles.title}>#{order.displayNumber.replace('MR-', '')}</Text></View><PaymentPill order={order} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ticket}><Text style={styles.panelTitle}>Kitchen ticket</Text><Text style={styles.meta}>{sourceLabel[order.source]} · {fulfilmentLabel[order.fulfilment]} · {order.status.toUpperCase()}</Text><View style={styles.divider} />
        {order.lines.map((line) => <View key={line.id} style={styles.lineRow}><View style={styles.lineText}><Text style={styles.line}>{line.quantity} × {line.name}</Text>{line.modifiers?.map((modifier) => <Text key={modifier} style={styles.modifier}>{modifier.toUpperCase()}</Text>)}</View><Text style={styles.price}>{formatMoney(line.quantity * line.unitPrice)}</Text></View>)}
        <View style={styles.divider} /><View style={styles.totalRow}><Text style={styles.totalLabel}>ORDER TOTAL</Text><Text style={styles.total}>{formatMoney(order.total)}</Text></View>
      </View>
      <View style={styles.side}><View style={styles.panel}><Text style={styles.panelTitle}>Customer</Text><Text style={styles.customer}>{order.customerName}</Text><Text style={styles.meta}>{order.customerPhone ?? 'No phone supplied'}</Text></View>
        <View style={styles.panel}><Text style={styles.panelTitle}>Payment</Text><View style={styles.totalRow}><Text style={styles.meta}>Paid</Text><Text style={styles.customer}>{formatMoney(order.netPaid)} / {formatMoney(order.total)}</Text></View>{order.paymentStatus !== 'paid' && <ActionButton label="RECORD BALANCE PAYMENT" onPress={() => recordPayment(order.id)} />}<Text style={styles.note}>Payment updates money only. It never changes kitchen status or inventory.</Text></View>
        <View style={styles.panel}><Text style={styles.panelTitle}>Order control</Text><ActionButton label={labels[order.status]} onPress={advance} disabled={order.status === 'completed' || order.status === 'cancelled'} /><ActionButton label="EDIT ORDER" variant="secondary" onPress={() => Alert.alert('Editor boundary', order.status === 'preparing' ? 'Prepared-item reductions must be classified as unused or waste.' : 'Saving edits will create a new revision and recalculate reservations.')} /><Text style={styles.note}>Revision {order.revision} · Inventory is reserved on Accept and consumed exactly once on Start Preparing.</Text></View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas }, header: { minHeight: 86, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: palette.border }, headerTitle: { alignItems: 'center' }, eyebrow: { color: palette.inkMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }, title: { color: palette.ink, fontFamily: typography.serif, fontSize: 28, fontWeight: '800' },
  content: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, padding: spacing.xl }, ticket: { flex: 2, minWidth: 340, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.lg, alignSelf: 'flex-start' }, panel: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.lg }, panelTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 22, fontWeight: '800' }, meta: { color: palette.inkMuted, fontFamily: typography.sans, fontSize: 12, fontWeight: '700' }, divider: { height: 1, backgroundColor: palette.border },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xl }, lineText: { flex: 1 }, line: { color: palette.ink, fontFamily: typography.sans, fontSize: 17, fontWeight: '800' }, modifier: { color: palette.red, fontFamily: typography.sans, fontSize: 11, fontWeight: '900', marginTop: spacing.xs, marginLeft: spacing.xl }, price: { color: palette.inkMuted, fontFamily: typography.sans, fontSize: 15, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }, totalLabel: { color: palette.inkMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, total: { color: palette.ink, fontFamily: typography.serif, fontSize: 30, fontWeight: '800' }, side: { flex: 1, minWidth: 300, gap: spacing.lg }, customer: { color: palette.ink, fontFamily: typography.sans, fontSize: 16, fontWeight: '800' }, note: { color: palette.inkMuted, fontFamily: typography.sans, fontSize: 11, lineHeight: 17 },
});
