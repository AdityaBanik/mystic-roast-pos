import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { PaymentPill } from '@/components/payment-pill';
import { ErrorNotice, Field, Page, Panel, ui } from '@/components/ui';
import { formatMoney, isClosed, refundDue, statusLabel } from '@/domain/orders';
import { useOrders } from '@/state/order-queries';

export default function HistoryScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState(params.filter === 'refunds' ? 'refunds' : 'all');
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { orders, error } = useOrders();
  const matching = orders.filter(o => (filter === 'all' || (filter === 'refunds' ? refundDue(o) > 0 : isClosed(o))) && [o.displayNumber, o.customerName, o.customerPhone ?? ''].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return <Page title="History & settlements" subtitle="Orders in this preview session">
    <ErrorNotice message={error} />
    <Field label="Search orders" placeholder="Order number, customer or phone" value={search} onChangeText={setSearch} />
    <View style={ui.row}>{[['all', 'ALL'], ['closed', 'CLOSED'], ['refunds', 'REFUNDS DUE']].map(([key, label]) => <ActionButton key={key} label={label} variant={filter === key ? 'primary' : 'secondary'} onPress={() => setFilter(key)} />)}</View>
    {!matching.length && <Panel><Text style={ui.body}>No matching orders.</Text></Panel>}
    {matching.map(o => <Panel key={o.id}><Pressable accessibilityRole="button" accessibilityLabel={'Open ' + o.displayNumber} onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} style={{ gap: 10, minHeight: 48 }}><View style={ui.between}><Text style={ui.section}>{o.displayNumber} · {o.customerName}</Text><PaymentPill order={o} /></View><Text style={ui.body}>{statusLabel[o.status]} · {formatMoney(o.total)}</Text><Text style={ui.muted}>{new Date(o.receivedAt).toLocaleString()} · Open ticket ›</Text></Pressable></Panel>)}
  </Page>;
}
