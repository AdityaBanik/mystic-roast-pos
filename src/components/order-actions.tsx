import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { amountDue, formatMoney, isClosed, parseMoney, paymentKind, primaryAction, refundDue, validatePayment } from '@/domain/orders';
import type { Disposition, Order } from '@/domain/orders';
import { errorMessage } from '@/services/order-repository';
import type { Command } from '@/services/order-repository';
import { useOrders } from '@/state/order-queries';
import { ActionButton } from './action-button';
import { ErrorNotice, Field, ui } from './ui';

export function OrderActions({ order, full = false }: { order: Order; full?: boolean }) {
  const router = useRouter();
  const { mutate, busy, mode, error: connectionError } = useOrders();
  const [error, setError] = useState<string>();
  const [sheet, setSheet] = useState<{ kind: 'payment' | 'cancel'; order: Order }>();
  const working = busy.includes(order.id);
  const disabled = mode !== 'preview' || !!connectionError || working;
  const primary = primaryAction(order);
  const payment = paymentKind(order);
  const run = async (command: Command) => {
    setError(undefined);
    try { await mutate(order, command); } catch (e) { setError(errorMessage(e)); }
  };
  return <View style={{ gap: 10 }}>
    <ErrorNotice message={error} />
    {primary?.reason && <Text style={ui.muted}>{primary.reason}</Text>}
    <View style={ui.row}>
      {payment && <ActionButton label={payment === 'refund' ? 'RECORD REFUND' : 'RECORD PAYMENT'} variant={payment === 'refund' ? 'danger' : 'secondary'} disabled={disabled} onPress={() => setSheet({ kind: 'payment', order })} style={{ flexGrow: 1 }} />}
      {primary && <ActionButton label={primary.label} busy={working} disabled={disabled || !!primary.reason} onPress={() => void run({ action: primary.action } as Command)} style={{ flexGrow: 1 }} />}
    </View>
    {order.status === 'received' && <Text style={ui.muted}>Accept before recording a payment.</Text>}
    {(full || order.status === 'received') && !isClosed(order) && <View style={ui.row}>
      <ActionButton label="EDIT ORDER" variant="secondary" disabled={disabled} onPress={() => router.push({ pathname: '/new-order', params: { orderId: order.id } })} style={{ flexGrow: 1 }} />
      <ActionButton label={order.status === 'received' ? 'REJECT ORDER' : 'CANCEL ORDER'} variant="danger" disabled={disabled} onPress={() => setSheet({ kind: 'cancel', order })} style={{ flexGrow: 1 }} />
    </View>}
    {sheet && <ActionSheet kind={sheet.kind} order={sheet.order} onClose={() => setSheet(undefined)} />}
  </View>;
}

function ActionSheet({ kind, order, onClose }: { kind: 'payment' | 'cancel'; order: Order; onClose: () => void }) {
  const { mutate, busy, orders } = useOrders();
  const payment = paymentKind(order);
  const due = payment === 'refund' ? refundDue(order) : amountDue(order);
  const [tender, setTender] = useState<'cash' | 'upi' | 'split'>('cash');
  const [cash, setCash] = useState(due.toFixed(2));
  const [upi, setUpi] = useState('0.00');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [disposition, setDisposition] = useState<Disposition>();
  const [error, setError] = useState<string>();
  const working = busy.includes(order.id);
  const changed = orders.find(o => o.id === order.id)?.version !== order.version;
  const chooseTender = (t: typeof tender) => {
    setTender(t); setCash(t === 'upi' ? '0.00' : due.toFixed(2)); setUpi(t === 'upi' ? due.toFixed(2) : '0.00');
  };
  const submit = async () => {
    setError(undefined);
    try {
      if (kind === 'payment') {
        const c = parseMoney(cash); const u = parseMoney(upi);
        if (c === null || u === null || !payment) { setError('Enter valid amounts with at most two decimal places.'); return; }
        const payload = { kind: payment, cash: c, upi: u, reference };
        const invalid = validatePayment(order, payload); if (invalid) { setError(invalid); return; }
        await mutate(order, { action: 'record_payment', payload });
      } else {
        if (!reason.trim()) { setError('Enter a reason for the order history.'); return; }
        if (order.stockConsumedAt && !disposition) { setError('Classify the prepared items as unused or waste.'); return; }
        await mutate(order, { action: order.status === 'received' ? 'reject' : 'cancel', payload: { reason: reason.trim(), disposition } });
      }
      onClose();
    } catch (e) { setError(errorMessage(e)); }
  };
  const title = kind === 'payment' ? payment === 'refund' ? 'Record refund' : 'Record payment' : order.status === 'received' ? 'Reject order' : 'Cancel order';
  return <Modal transparent animationType="fade" visible onRequestClose={() => { if (!working) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#00000077', justifyContent: 'center', padding: 16 }}>
      <View accessibilityViewIsModal style={[ui.panel, { maxWidth: 560, width: '100%', alignSelf: 'center', maxHeight: '90%' }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
          <Text accessibilityRole="header" style={ui.title}>{title} · {order.displayNumber}</Text>
          <Text style={ui.muted}>Preview only · no real money or stock is changed.</Text>
          <ErrorNotice message={changed ? 'This order changed while the form was open. Close and reopen it to review the latest amounts.' : error} />
          {kind === 'payment' ? <>
            <Text style={ui.section}>{formatMoney(due)} {payment === 'refund' ? 'to return' : 'outstanding'}</Text>
            <View style={ui.row}>{(['cash', 'upi', 'split'] as const).map(t => <ActionButton key={t} label={t.toUpperCase()} variant={tender === t ? 'primary' : 'secondary'} disabled={working} onPress={() => chooseTender(t)} />)}</View>
            {tender !== 'upi' && <Field label={payment === 'refund' ? 'Cash returned (₹)' : 'Cash received (₹)'} keyboardType="decimal-pad" value={cash} onChangeText={setCash} editable={!working} />}
            {tender !== 'cash' && <Field label={payment === 'refund' ? 'UPI returned (₹)' : 'UPI received (₹)'} keyboardType="decimal-pad" value={upi} onChangeText={setUpi} editable={!working} />}
            <Field label="Reference (optional)" value={reference} onChangeText={setReference} maxLength={200} editable={!working} />
            <Text style={ui.muted}>Cash and UPI together must cover the full amount. Partial settlement is not available. Only record a payment or refund after the money has been received or returned.</Text>
          </> : <>
            <Field label="Reason" value={reason} onChangeText={setReason} maxLength={1000} multiline editable={!working} />
            {!!order.stockConsumedAt && <>
              <Text style={ui.body}>Classify all remaining prepared items. Unused items are returned to stock; waste is recorded without a second deduction.</Text>
              <View style={ui.row}>{(['unused', 'waste'] as const).map(d => <ActionButton key={d} label={d.toUpperCase()} variant={disposition === d ? 'primary' : 'secondary'} disabled={working} onPress={() => setDisposition(d)} />)}</View>
              <Text style={ui.muted}>For a mixture of unused and wasted lines, edit and classify each line first.</Text>
            </>}
            {order.netPaid > 0 && <Text style={ui.body}>{formatMoney(order.netPaid)} will remain due for refund. Cancellation does not return the payment automatically.</Text>}
          </>}
          <ActionButton label={kind === 'payment' ? payment === 'refund' ? 'CONFIRM REFUND RECORDED' : 'CONFIRM PAYMENT RECEIVED' : 'CONFIRM ' + (order.status === 'received' ? 'REJECTION' : 'CANCELLATION')} variant={kind === 'cancel' || payment === 'refund' ? 'danger' : 'primary'} disabled={changed} busy={working} onPress={() => void submit()} />
          <ActionButton label="GO BACK" variant="secondary" disabled={working} onPress={onClose} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
