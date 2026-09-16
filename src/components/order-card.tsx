import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PaymentPill } from '@/components/payment-pill';
import { palette, radii, shadow, spacing, typography } from '@/constants/theme';
import { formatMoney, fulfilmentLabel, Order, sourceLabel } from '@/domain/orders';
import { useOrderStore } from '@/state/order-store';

function elapsedLabel(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const { acceptOrder, startPreparing, markReady, completeOrder, recordPayment } = useOrderStore();
  const timerOrigin = order.readyAt ?? order.preparingAt ?? order.acceptedAt ?? order.receivedAt;
  const [, refreshTimer] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => refreshTimer((value) => value + 1), 1_000);
    return () => clearInterval(timer);
  }, []);
  const actionLabel = { received: 'ACCEPT ORDER', accepted: 'START PREPARING', preparing: 'MARK READY', ready: 'COMPLETE ORDER', completed: 'COMPLETED', cancelled: 'CANCELLED' }[order.status];

  const mainAction = () => {
    if (order.status === 'received') acceptOrder(order.id);
    else if (order.status === 'accepted') startPreparing(order.id);
    else if (order.status === 'preparing') markReady(order.id);
    else if (order.status === 'ready' && !completeOrder(order.id)) Alert.alert('Payment due', 'Record the outstanding payment before completing this order.');
  };

  return <Pressable onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.topRow}>
      <View><Text style={styles.orderNumber}>#{order.displayNumber.replace('MR-', '')}</Text><Text style={styles.source}>{sourceLabel[order.source]} · {fulfilmentLabel[order.fulfilment]}</Text></View>
      <View style={styles.timerWrap}><Text style={styles.timer}>{elapsedLabel(timerOrigin)}</Text><Text style={styles.timerCaption}>{order.status === 'ready' ? 'READY' : 'ELAPSED'}</Text></View>
    </View>
    <Text style={styles.customer}>{order.customerName}</Text>
    <View style={styles.divider} />
    <View style={styles.lines}>{order.lines.map((line) => <View key={line.id}>
      <Text style={styles.line}><Text style={styles.quantity}>{line.quantity} × </Text>{line.name}</Text>
      {line.modifiers?.map((modifier) => <Text key={modifier} style={styles.modifier}>↳ {modifier.toUpperCase()}</Text>)}
    </View>)}</View>
    <View style={styles.paymentRow}><Text style={styles.total}>{formatMoney(order.total)}</Text><PaymentPill order={order} /></View>
    <View style={styles.actions}>
      {order.paymentStatus !== 'paid' && <ActionButton label="RECORD PAYMENT" variant="secondary" onPress={() => recordPayment(order.id)} style={styles.secondaryAction} />}
      <ActionButton label={actionLabel} onPress={mainAction} style={styles.primaryAction} />
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, gap: spacing.md, minHeight: 330, ...shadow },
  pressed: { opacity: 0.92 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontFamily: typography.serif, color: palette.ink, fontSize: 30, fontWeight: '800' }, source: { fontFamily: typography.sans, color: palette.inkMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 3 },
  timerWrap: { alignItems: 'flex-end' }, timer: { fontFamily: typography.mono, color: palette.ink, fontSize: 21, fontWeight: '700' }, timerCaption: { color: palette.inkMuted, fontFamily: typography.sans, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  customer: { fontFamily: typography.sans, color: palette.inkMuted, fontSize: 14, fontWeight: '600' }, divider: { height: 1, backgroundColor: palette.border },
  lines: { gap: spacing.md, flex: 1 }, line: { color: palette.ink, fontFamily: typography.sans, fontSize: 16, fontWeight: '700', lineHeight: 23 }, quantity: { color: palette.olive, fontWeight: '900' },
  modifier: { color: palette.red, fontFamily: typography.sans, fontSize: 12, fontWeight: '900', letterSpacing: 0.7, marginTop: 4, marginLeft: spacing.md },
  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, total: { color: palette.ink, fontFamily: typography.serif, fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm }, secondaryAction: { flex: 1 }, primaryAction: { flex: 1.25 },
});
