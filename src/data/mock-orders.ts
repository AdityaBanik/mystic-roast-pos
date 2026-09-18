import type { Order, OrderLine } from '../domain/orders';
import { previewMenu } from './preview-menu';

export function initialOrders(): Order[] {
  const ago = (n: number) => new Date(Date.now() - n * 60000).toISOString();
  const line = (index: number, key: string, quantity = 1): OrderLine => {
    const m = previewMenu[index];
    return { id: key, menuItemId: m.id, name: m.name, quantity, unitPrice: m.price, selectedComponentIds: [], modifiers: [], note: '' };
  };
  const base = (number: number, customerName: string, lines: OrderLine[]): Order => ({
    id: 'preview-' + number, displayNumber: 'MR-' + number, branchId: 'preview-batanagar', customerName,
    source: 'staff_pos', fulfilment: 'takeaway', status: 'received', paymentStatus: 'unpaid',
    total: lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), netPaid: 0, revision: 1, version: 2,
    consumedRevision: null, notes: '', receivedAt: ago(2), lines, payments: [], events: [], settlementConfirmed: false,
  });
  const received: Order = { ...base(148, 'Ananya', [line(1, '148-a'), line(4, '148-b')]), source: 'qr_customer' };
  const accepted: Order = { ...base(147, 'Rohan', [line(0, '147-a', 2), line(6, '147-b')]), status: 'accepted', receivedAt: ago(8), acceptedAt: ago(6), fulfilment: 'dine_in', tableNumber: 3 };
  accepted.lines[0].note = 'No onion';
  const preparing: Order = { ...base(146, 'Priya', [line(0, '146-a'), line(5, '146-b')]), status: 'preparing', receivedAt: ago(19), acceptedAt: ago(16), preparingAt: ago(14), stockConsumedAt: ago(14), consumedRevision: 1 };
  const ready: Order = { ...base(145, 'Arjun', [line(0, '145-a', 2)]), status: 'ready', receivedAt: ago(27), acceptedAt: ago(25), preparingAt: ago(20), stockConsumedAt: ago(20), readyAt: ago(4), consumedRevision: 1, netPaid: 498, paymentStatus: 'paid', settlementConfirmed: true };
  ready.payments = [{ id: 'preview-payment-145', operationId: 'fixture-145', method: 'upi', kind: 'collection', amount: 498, reference: 'Sample payment', occurredAt: ago(5) }];
  const cancelled: Order = { ...base(144, 'Sam', [line(2, '144-a')]), status: 'cancelled', total: 0, netPaid: 179, paymentStatus: 'refund_due', acceptedAt: ago(35), cancelledAt: ago(30), receivedAt: ago(40) };
  cancelled.payments = [{ id: 'preview-payment-144', operationId: 'fixture-144', method: 'cash', kind: 'collection', amount: 179, reference: 'Sample payment', occurredAt: ago(34) }];
  return [received, accepted, preparing, ready, cancelled].map(o => ({
    ...o, events: [{ id: 'fixture-' + o.id, version: o.version, revision: o.revision, action: 'sample', occurredAt: o.receivedAt, description: 'Sample ticket loaded for preview' }],
  }));
}
