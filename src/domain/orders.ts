export const kitchenStatuses = ['received', 'accepted', 'preparing', 'ready', 'completed', 'rejected', 'cancelled'] as const;
export type KitchenStatus = typeof kitchenStatuses[number];
export const paymentStatuses = ['unpaid', 'part_paid', 'paid', 'refund_due', 'refunded'] as const;
export type PaymentStatus = typeof paymentStatuses[number];
export type OrderSource = 'qr_customer' | 'staff_pos';
// Fulfilment is preview-only until the backend supports it. Never infer it from source.
export type FulfilmentType = 'dine_in' | 'takeaway' | 'delivery';
export type KitchenTab = 'orders' | 'preparing' | 'ready';
export type Disposition = 'unused' | 'waste';
export type PaymentKind = 'collection' | 'refund';
export type OrderAction = 'accept' | 'start_preparing' | 'mark_ready' | 'complete' | 'edit' | 'record_payment' | 'cancel' | 'reject';
export type OrderLine = {
  id: string; menuItemId: string; name: string; quantity: number; unitPrice: number;
  selectedComponentIds: string[]; modifiers: string[]; note: string;
};
export type Payment = { id: string; operationId: string; kind: PaymentKind; method: 'cash' | 'upi'; amount: number; reference: string; occurredAt: string };
export type OrderEvent = { id: string; version: number; revision: number; action: string; occurredAt: string; description: string };
export type Order = {
  id: string; branchId: string; displayNumber: string; customerName: string; customerPhone?: string;
  source: OrderSource; fulfilment?: FulfilmentType; tableNumber?: number;
  status: KitchenStatus; paymentStatus: PaymentStatus;
  total: number; netPaid: number; revision: number; version: number; consumedRevision: number | null;
  lines: OrderLine[]; notes: string;
  receivedAt: string; acceptedAt?: string; preparingAt?: string; readyAt?: string;
  completedAt?: string; cancelledAt?: string; rejectedAt?: string; stockConsumedAt?: string;
  settlementConfirmed?: boolean;
  payments?: Payment[]; events?: OrderEvent[];
};
export type NewOrderInput = { customerName: string; customerPhone?: string; fulfilment: FulfilmentType; tableNumber?: number; notes: string; lines: OrderLine[] };
export type EditInput = { lines: OrderLine[]; note: string; removalDispositions: Record<string, Disposition> };
export type PaymentInput = { kind: PaymentKind; cash: number; upi: number; reference: string };
export const sourceLabel: Record<OrderSource, string> = { qr_customer: 'QR ORDER', staff_pos: 'STAFF ORDER' };
export const statusLabel: Record<KitchenStatus, string> = { received: 'NEW · NOT RESERVED', accepted: 'ACCEPTED · RESERVED', preparing: 'PREPARING', ready: 'READY FOR HANDOFF', completed: 'COMPLETED', rejected: 'REJECTED', cancelled: 'CANCELLED' };
export const fulfilmentLabel = (order: Pick<Order, 'fulfilment' | 'tableNumber'>) => order.fulfilment === 'dine_in' ? `DINE-IN${order.tableNumber ? ` · TABLE ${order.tableNumber}` : ''}` : order.fulfilment === 'takeaway' ? 'TAKEAWAY' : order.fulfilment === 'delivery' ? 'DELIVERY' : order.tableNumber ? `TABLE ${order.tableNumber}` : 'FULFILMENT NOT SPECIFIED';
export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (amount: number) => amount / 100;
export const formatMoney = (amount: number) => `₹${amount.toFixed(2)}`;
export const amountDue = (o: Order) => fromCents(Math.max(0, toCents(o.total) - toCents(o.netPaid)));
export const refundDue = (o: Order) => fromCents(Math.max(0, toCents(o.netPaid) - toCents(o.total)));
export const isClosed = (o: Order) => ['completed', 'cancelled', 'rejected'].includes(o.status);
export const inTab = (o: Order, tab: KitchenTab) => tab === 'orders' ? o.status === 'received' || o.status === 'accepted' : o.status === tab;
export const paymentKind = (o: Order): PaymentKind | null => {
  if (!o.acceptedAt || o.status === 'completed') return null;
  if (refundDue(o) > 0) return 'refund';
  return !isClosed(o) && amountDue(o) > 0 ? 'collection' : null;
};
export function primaryAction(o: Order): { action: OrderAction; label: string; reason?: string } | null {
  if (o.status === 'received') return { action: 'accept', label: 'ACCEPT ORDER' };
  if (o.status === 'accepted') return { action: 'start_preparing', label: 'START PREPARING' };
  if (o.status === 'preparing') return o.consumedRevision !== o.revision
    ? { action: 'start_preparing', label: 'PREPARE ADDED ITEMS' }
    : { action: 'mark_ready', label: 'MARK READY' };
  if (o.status === 'ready') return { action: 'complete', label: 'COMPLETE ORDER', reason:
    amountDue(o) > 0 ? 'Collect the balance before completing.' : refundDue(o) > 0 ? 'Resolve the refund before completing.' :
    o.consumedRevision !== o.revision ? 'The current revision still needs preparation.' :
    o.settlementConfirmed === false ? 'Financial settlement is not complete.' : undefined };
  return null;
}
export function parseMoney(value: string): number | null {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount <= 100000000 ? amount : null;
}
export function validatePayment(o: Order, p: PaymentInput): string | null {
  if (paymentKind(o) !== p.kind) return 'This payment is no longer available. Refresh the order.';
  if ([p.cash, p.upi].some(n => !Number.isFinite(n) || n < 0 || n > 100000000 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001)) return 'Enter non-negative amounts with at most two decimal places.';
  const due = p.kind === 'refund' ? refundDue(o) : amountDue(o);
  if (toCents(p.cash) + toCents(p.upi) !== toCents(due) || due <= 0) return `Cash and UPI must total ${formatMoney(due)}. Partial settlement is not supported.`;
  return null;
}
export const timerOrigin = (o: Order) => o.status === 'ready' ? o.readyAt ?? o.receivedAt : o.status === 'preparing' ? o.preparingAt ?? o.receivedAt : o.receivedAt;
