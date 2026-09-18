import { kitchenStatuses, paymentStatuses } from '../domain/orders';
import type { Order, OrderLine } from '../domain/orders';
import { OrderError } from './order-repository';

type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new OrderError('INVALID_TICKET', 'The server returned an unsupported ticket. Refresh before acting on it.'); };
const object = (v: unknown): JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as JsonObject : invalid();
const string = (v: unknown): string => typeof v === 'string' ? v : invalid();
const number = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : invalid();
const integer = (v: unknown): number => Number.isSafeInteger(v) && (v as number) > 0 ? v as number : invalid();
const timestamp = (v: unknown): string | undefined => v == null ? undefined : typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : invalid();

// Exact projection of mr_order_private.ticket. Do not synthesize a phone,
// fulfilment, ledger history or settlement guarantee that the RPC did not return.
export function decodeTicket(value: unknown): Order {
  const t = object(value);
  if (!kitchenStatuses.includes(t.status as Order['status']) || !paymentStatuses.includes(t.payment_status as Order['paymentStatus'])) return invalid();
  if (t.source !== 'qr_customer' && t.source !== 'staff_pos') return invalid();
  if (!Array.isArray(t.lines)) return invalid();
  const lines: OrderLine[] = t.lines.map(v => {
    const l = object(v);
    if (!Array.isArray(l.selected_component_ids) || !Array.isArray(l.components)) return invalid();
    return { id: string(l.line_key), menuItemId: string(l.menu_item_id), name: string(l.name), quantity: integer(l.quantity), unitPrice: number(l.unit_price),
      selectedComponentIds: l.selected_component_ids.map(string), modifiers: l.components.map(c => string(object(c).name)), note: string(l.note ?? '') };
  });
  if (new Set(lines.map(l => l.id)).size !== lines.length) return invalid();
  return {
    id: string(t.id), branchId: string(t.branch_id), displayNumber: 'MR-' + integer(t.order_number), customerName: string(t.customer_name),
    source: t.source, status: t.status as Order['status'], paymentStatus: t.payment_status as Order['paymentStatus'],
    total: number(t.total), netPaid: number(t.net_paid), revision: integer(t.revision), version: integer(t.version),
    consumedRevision: t.consumed_revision == null ? null : integer(t.consumed_revision),
    lines, notes: string(t.note), tableNumber: t.table_number == null ? undefined : integer(t.table_number),
    receivedAt: timestamp(t.received_at) ?? invalid(), acceptedAt: timestamp(t.accepted_at), preparingAt: timestamp(t.preparing_at),
    readyAt: timestamp(t.ready_at), completedAt: timestamp(t.completed_at), cancelledAt: timestamp(t.cancelled_at), rejectedAt: timestamp(t.rejected_at), stockConsumedAt: timestamp(t.stock_consumed_at),
  };
}
