import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { formatMoney, Order } from '@/domain/orders';

export function PaymentPill({ order }: { order: Order }) {
  const paid = order.paymentStatus === 'paid';
  const label = paid ? 'PAID' : order.paymentStatus === 'part_paid' ? `${formatMoney(order.netPaid)} PAID` : order.paymentStatus === 'refund_due' ? 'REFUND DUE' : 'UNPAID';
  return <View style={[styles.pill, paid ? styles.paid : styles.unpaid]}><Text style={[styles.text, paid ? styles.paidText : styles.unpaidText]}>{paid ? '● ' : ''}{label}</Text></View>;
}

const styles = StyleSheet.create({
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 }, paid: { backgroundColor: palette.greenSoft }, unpaid: { backgroundColor: palette.amberSoft },
  text: { fontFamily: typography.sans, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 }, paidText: { color: palette.green }, unpaidText: { color: palette.amber },
});
