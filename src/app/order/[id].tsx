import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { OrderActions } from '@/components/order-actions';
import { PaymentPill } from '@/components/payment-pill';
import { Page, Panel, ui } from '@/components/ui';
import { amountDue, formatMoney, fulfilmentLabel, refundDue, sourceLabel, statusLabel } from '@/domain/orders';
import { useOrders } from '@/state/order-queries';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { orders, loading, refresh } = useOrders();
  const order = orders.find(o => o.id === id);
  if (!order) return <Page title={loading ? 'Loading ticket…' : 'Ticket unavailable'}><Panel><Text style={ui.body}>This ticket is not in the current session. Preview orders reset on reload.</Text><ActionButton label="REFRESH" variant="secondary" onPress={() => void refresh()} /></Panel></Page>;
  return <Page title={order.displayNumber} subtitle={statusLabel[order.status]}>
    <Panel title="Kitchen ticket">
      <View style={ui.between}><Text style={ui.body}>{sourceLabel[order.source]} · {fulfilmentLabel(order)}</Text><PaymentPill order={order} /></View>
      <Text style={ui.title}>{order.customerName}</Text>
      <Text style={ui.muted}>{order.customerPhone ?? 'Phone not available on this ticket'}</Text>
      <View style={ui.divider} />
      {order.lines.map(l => <View key={l.id} style={{ gap: 5 }}><View style={ui.between}><Text style={ui.body}>{l.quantity} × {l.name}</Text><Text style={ui.body}>{formatMoney(l.quantity * l.unitPrice)}</Text></View>{l.modifiers.map((m, i) => <Text key={i} style={ui.muted}>{m}</Text>)}{!!l.note && <Text style={ui.label}>NOTE: {l.note}</Text>}</View>)}
      {!!order.notes && <Text style={ui.body}>Order note: {order.notes}</Text>}
      <View style={ui.divider} /><View style={ui.between}><Text style={ui.section}>Current total</Text><Text style={ui.section}>{formatMoney(order.total)}</Text></View>
    </Panel>
    <Panel title="Order actions"><OrderActions order={order} full /><Text style={ui.muted}>Revision {order.revision} · Version {order.version}</Text>{order.status === 'preparing' && order.consumedRevision !== order.revision && <Text style={ui.body}>Added items are waiting for preparation. Confirm them before marking this order ready.</Text>}</Panel>
    <Panel title="Payments">
      <View style={ui.between}><Text style={ui.body}>Net paid</Text><Text style={ui.body}>{formatMoney(order.netPaid)}</Text></View>
      <View style={ui.between}><Text style={ui.body}>{refundDue(order) > 0 ? 'Refund due' : 'Balance due'}</Text><Text style={ui.body}>{formatMoney(refundDue(order) || amountDue(order))}</Text></View>
      {order.payments?.length ? order.payments.map(p => <View key={p.id}><Text style={ui.body}>{p.kind === 'refund' ? 'Refund' : 'Payment'} · {p.method.toUpperCase()} · {formatMoney(p.amount)}</Text><Text style={ui.muted}>{new Date(p.occurredAt).toLocaleString()}{p.reference ? ' · ' + p.reference : ''}</Text></View>) : <Text style={ui.muted}>No payment entries available.</Text>}
      <ActionButton label="VIEW RECEIPT" variant="secondary" onPress={() => router.push({ pathname: '/receipt', params: { id: order.id } })} />
      {order.status === 'completed' && <Text style={ui.muted}>Completed-order refunds and reversals are not available.</Text>}
    </Panel>
    <Panel title="Order history">
      {order.events?.length ? [...order.events].reverse().map(e => <View key={e.id}><Text style={ui.body}>{e.description}</Text><Text style={ui.muted}>Revision {e.revision} · Version {e.version} · {new Date(e.occurredAt).toLocaleString()}</Text></View>) : <Text style={ui.muted}>Detailed history is unavailable for this ticket.</Text>}
      <Text style={ui.muted}>Recall is not supported. Viewing this ticket does not change its status.</Text>
    </Panel>
  </Page>;
}
