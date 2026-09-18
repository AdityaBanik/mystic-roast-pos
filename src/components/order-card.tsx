import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PaymentPill } from './payment-pill';
import { OrderActions } from './order-actions';
import { palette, radii, typography } from '@/constants/theme';
import { formatMoney, fulfilmentLabel, Order, sourceLabel, statusLabel, timerOrigin } from '@/domain/orders';

export function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.floor((now - new Date(timerOrigin(order)).getTime()) / 1000));
  const elapsed = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  const urgency = seconds >= 1200 ? 'LONG WAIT' : seconds >= 600 ? 'CHECK PROGRESS' : '';
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + order.displayNumber + ', ' + order.customerName + ', ' + statusLabel[order.status]} onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })} style={styles.ticket}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}><Text style={styles.number}>{order.displayNumber}</Text><Text style={styles.meta}>{sourceLabel[order.source]}</Text></View>
        <View style={{ alignItems: 'flex-end' }}><Text accessibilityLabel={Math.floor(seconds / 60) + ' minutes elapsed'} style={[styles.timer, urgency && { color: palette.red }]}>{elapsed}</Text><Text style={styles.meta}>{order.status === 'ready' ? 'READY FOR' : order.status === 'preparing' ? 'PREPARING FOR' : 'SINCE ORDER'}</Text>{!!urgency && <Text style={styles.urgency}>{urgency}</Text>}</View>
      </View>
      <Text style={styles.status}>{statusLabel[order.status]}</Text>
      <Text style={[styles.customer, order.status === 'ready' && { fontSize: 25 }]}>{order.customerName}</Text>
      <Text style={styles.fulfilment}>{fulfilmentLabel(order)}</Text>
      <View style={styles.divider} />
      {order.lines.map(line => <View key={line.id}>
        <Text style={styles.line}>{line.quantity} × {line.name}</Text>
        {line.modifiers.map((modifier, i) => <Text key={i} style={styles.modifier}>{modifier}</Text>)}
        {!!line.note && <Text style={styles.modifier}>NOTE: {line.note.toUpperCase()}</Text>}
      </View>)}
      {!!order.notes && <Text style={styles.modifier}>ORDER NOTE: {order.notes}</Text>}
      <View style={styles.top}><Text style={styles.total}>{formatMoney(order.total)}</Text><PaymentPill order={order} /></View>
      <Text style={styles.meta}>VIEW TICKET ›</Text>
    </Pressable>
    <OrderActions order={order} />
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: 18, gap: 18 },
  ticket: { gap: 12, minHeight: 44 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  number: { fontFamily: typography.serif, fontSize: 29, fontWeight: '800', color: palette.ink },
  meta: { color: palette.inkMuted, fontSize: 10, fontWeight: '700', marginTop: 4 },
  timer: { fontFamily: typography.mono, fontSize: 21, color: palette.ink, fontWeight: '700' },
  urgency: { color: palette.red, fontSize: 10, fontWeight: '800', marginTop: 4 },
  status: { alignSelf: 'flex-start', color: palette.oliveDark, backgroundColor: palette.oliveSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, fontWeight: '800', fontSize: 11 },
  customer: { color: palette.ink, fontWeight: '700', fontSize: 19 },
  fulfilment: { color: palette.ink, fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: palette.border },
  line: { color: palette.ink, fontSize: 16, fontWeight: '700', lineHeight: 24 },
  modifier: { color: palette.red, fontSize: 12, fontWeight: '800', lineHeight: 20, marginLeft: 10 },
  total: { color: palette.ink, fontFamily: typography.serif, fontSize: 22, fontWeight: '700' },
});
