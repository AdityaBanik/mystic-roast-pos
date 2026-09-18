import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, Text } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { ErrorNotice, Page, Panel, ui } from '@/components/ui';
import { amountDue, formatMoney, refundDue } from '@/domain/orders';
import { useOrders } from '@/state/order-queries';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useOrders();
  const [error, setError] = useState<string>();
  const o = orders.find(o => o.id === id);
  if (!o) return <Page title="Receipt unavailable"><Text style={ui.body}>This order is not available in the current session.</Text></Page>;
  const text = ['MYSTIC ROAST · PREVIEW RECEIPT', 'NOT A TAX INVOICE · NO REAL PAYMENT', o.displayNumber + ' · Revision ' + o.revision, o.customerName, new Date(o.receivedAt).toLocaleString(), '', ...o.lines.map(l => l.quantity + ' × ' + l.name + '  ' + formatMoney(l.quantity * l.unitPrice)), '', 'Current total: ' + formatMoney(o.total), 'Net paid: ' + formatMoney(o.netPaid), 'Balance due: ' + formatMoney(amountDue(o)), 'Refund due: ' + formatMoney(refundDue(o)), '', ...(o.payments ?? []).map(p => p.kind.toUpperCase() + ' · ' + p.method.toUpperCase() + ' · ' + formatMoney(p.amount))].join('\n');
  return <Page title="Receipt preview"><Panel><Text selectable style={[ui.body, { lineHeight: 28 }]}>{text}</Text><ErrorNotice message={error} /><ActionButton label="SHARE PREVIEW RECEIPT" variant="secondary" onPress={() => { void Share.share({ message: text }).catch(() => setError('Sharing is not available on this device. You can select and copy the receipt text.')); }} /><Text style={ui.muted}>Printer connection and tax-invoice details are not configured.</Text></Panel></Page>;
}
