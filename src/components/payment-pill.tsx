import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { amountDue, formatMoney, Order, refundDue } from '@/domain/orders';

export function PaymentPill({ order }: { order: Order }) {
  const paid = order.paymentStatus === 'paid';
  const label = order.paymentStatus === 'refunded' ? 'REFUNDED' : refundDue(order) > 0 ? `${formatMoney(refundDue(order))} REFUND DUE` : paid ? 'PAID' : order.paymentStatus === 'part_paid' ? `${formatMoney(amountDue(order))} BALANCE DUE` : `${formatMoney(amountDue(order))} UNPAID`;
  return <View style={[styles.pill, paid ? styles.paid : styles.unpaid]}><Text style={[styles.text, paid ? styles.paidText : styles.unpaidText]}>{paid ? '● ' : ''}{label}</Text></View>;
}

const styles = StyleSheet.create({
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 }, paid: { backgroundColor: palette.greenSoft }, unpaid: { backgroundColor: palette.amberSoft },
  text: { fontFamily: typography.sans, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 }, paidText: { color: palette.green }, unpaidText: { color: palette.amber },
});
